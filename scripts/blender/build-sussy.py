# Import the "Sussy" Roblox model into Blender, polish it, and export an R6-rigged GLB for the website.
#
# Source model: `R6_SussySuspector_1265476893` in Roblox Studio (classic R6 rig).
#   assets-src/sussy/parts.json    part transforms, sizes and SpecialMesh data dumped from Studio
#                                  (relative to HumanoidRootPart)
#   assets-src/sussy/meshes/*.json original Roblox meshes decoded with scripts/rbxmesh-to-json.mjs
#                                  (from assetdelivery or Studio's local content cache)
#   assets-src/sussy/textures/*    original textures (cache KTX2 decoded to PNG) + the face decal
#
# Quality pass only: original geometry is kept. Accessories keep Roblox's own vertex normals (v7 Draco meshes
# store them as a GENERIC attribute) so cloth like the scarf shades as smoothly as in Studio; meshes without
# normals are welded and get angle-based smoothing. PBR materials are assigned per piece.
#
# Body parts are the R6 blocks themselves; accessories (SpecialMesh FileMesh, scaled by `mesh.scale`) are
# merged into the R6 part they hang from, so the R6 animation pack drives everything. Geometry is authored in Roblox space (Y up, faces -Z, studs)
# relative to each R6 part centre, then converted to Blender space (x, -z, y); the Y-up glTF export
# lands it back in Roblox space.
#
# Run: `blender -b -P scripts/blender/build-sussy.py` or send the file to the Blender MCP addon.
import json
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

# Repo root: two levels above this file when run with `blender -P`; PORTFOLIO_ROOT when sent to a running Blender.
_HERE = globals().get("__file__")
ROOT = os.environ.get("PORTFOLIO_ROOT") or (os.path.abspath(os.path.join(os.path.dirname(_HERE), "../..")) if _HERE else os.getcwd())
SRC = os.path.join(ROOT, "assets-src/sussy")
OUT = os.path.join(ROOT, "public/models/sussy/sussy-r6.glb")

GROUP_CENTER = {
    "Torso": Vector((0, 0, 0)), "Head": Vector((0, 1.5, 0)),
    "RightArm": Vector((1.5, 0, 0)), "LeftArm": Vector((-1.5, 0, 0)),
    "RightLeg": Vector((0.5, -2, 0)), "LeftLeg": Vector((-0.5, -2, 0)),
}
# Accessory meshes by Roblox asset id -> (mesh file, R6 part it is worn on).
# 4546389367 is Sussy's visible head: a white egg with eye holes inside a black inverted-hull shell
# (outline + eyes). The 1-bit texture is black on top / white below, so the shells are split by UV v.
ACCESSORIES = {"3963788594": ("Trilby", "Head"), "4820755895": ("Glasses", "Head"), "4546389367": ("Egg", "Head"),
               "123160367470095": ("TacBelts", "Torso"), "138076927962847": ("Scarf", "Torso")}
R6_PARTS = {"Torso": "Torso", "Head": "Head", "Left Arm": "LeftArm", "Right Arm": "RightArm", "Left Leg": "LeftLeg", "Right Leg": "RightLeg"}
# The dynamic head mesh is fully enclosed by the egg and never visible.
SKIP_MESHES = {"108826953212433"}
# The pixel glasses on the trilby brim come from the HumanoidDescription Face accessory (4820765156): Studio
# renders it but the R6 model has no instance for it, so its transform is taken from the R15 rig of the same avatar.
EXTRA_PARTS = [{
    "name": "GlassesAccessory/Handle", "color": "a3a2a5", "size": [1.45, 0.28, 1.0],
    "cframe": [0.24518, 2.03945, -0.37459, 0.8702, -0.03913, -0.49114, -0.06168, 0.98035, -0.18738, 0.48882, 0.19335, 0.85069],
    "mesh": {"id": "rbxassetid://4820755895", "scale": [1.2, 1.2, 1.2], "offset": [0, 0, 0]},
}]
SMOOTH_ANGLE = {"Egg": 80, "Scarf": 75, "Trilby": 60, "TacBelts": 40, "Glasses": 20, "Head": 80}
# Meshes whose original Roblox normals are used as custom split normals (the egg keeps its rebuilt normals:
# its black shell is an inverted hull).
ORIGINAL_NORMALS = {"TacBelts", "Trilby", "Glasses"}
# The Roblox scarf mesh is a crumpled double-layer sheet: on the web its tiny wrinkles read as blotches, and
# smoothing collapses the two layers into each other. It is rebuilt instead (build_scarf): same silhouette as in
# Studio — a thick wrap round the neck, a drape over the chest and a tail hanging on the character's left.
# bmesh -> per-vertex normals (Roblox space), filled by load_mesh(..., normals=True).
VERTEX_NORMALS = {}


def to_blender(v):
    return Vector((v[0], -v[2], v[1]))


def hex_rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    c = np.asarray(c, dtype=np.float32)
    return list(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


def cframe_matrix(c):
    x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22 = c
    return Matrix(((r00, r01, r02, x), (r10, r11, r12, y), (r20, r21, r22, z), (0, 0, 0, 1)))


def load_rgba(file):
    # Re-encode as 8-bit RGBA: grayscale / 1-bit PNGs otherwise export as empty glTF images.
    src = bpy.data.images.load(os.path.join(SRC, "textures", file), check_existing=False)
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32)
    bpy.data.images.remove(src)
    img = bpy.data.images.new(file.rsplit(".", 1)[0], w, h, alpha=True)
    img.pixels.foreach_set(px)
    img.filepath_raw = os.path.join(SRC, f"_rgba_{file}")
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


MATS = {}


def mat(name, color="ffffff", rough=0.55, metal=0.0, image=None, coat=0.0, sheen=0.0, cull=False):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = cull  # glTF exports doubleSided = not culling
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*lin(hex_rgb(color)), 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Specular IOR Level"].default_value = 0.4
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Sheen Weight"].default_value = sheen
    if image:
        tex = m.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = load_rgba(image)
        m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    MATS[name] = m
    return m


def load_mesh(name, scale, keep=None, normals=False):
    """Load a decoded Roblox mesh; `keep(v)` filters triangles by their mean (Blender-space) UV v.
    With `normals`, the file's vertex normals are kept (no welding, so vertex order matches them)."""
    data = json.load(open(os.path.join(SRC, "meshes", f"{name}.json")))
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    p, idx, uvs = data["position"], data["index"], data["uv"]
    verts = [bm.verts.new((p[i] * scale[0], p[i + 1] * scale[1], p[i + 2] * scale[2])) for i in range(0, len(p), 3)]
    for t in range(0, len(idx), 3):
        tri = idx[t:t + 3]
        if keep and uvs and not keep(sum(1 - uvs[i * 2 + 1] for i in tri) / 3):
            continue
        try:
            f = bm.faces.new([verts[i] for i in tri])
        except ValueError:
            continue
        for loop, i in zip(f.loops, tri):
            loop[uv].uv = (uvs[i * 2], 1 - uvs[i * 2 + 1]) if uvs else (0.5, 0.5)
    n = data.get("normal") or []
    if normals and len(n) == len(p):
        # Normals transform with the inverse scale (non-uniform SpecialMesh scale).
        VERTEX_NORMALS[id(bm)] = [Vector((n[i] / scale[0], n[i + 1] / scale[1], n[i + 2] / scale[2])) for i in range(0, len(n), 3)]
    else:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    return bm


def tube(points, radius, ring=8):
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(Vector((0, 0, 1))).normalized()
        up = side.cross(t).normalized()
        rings.append([bm.verts.new(p + side * math.cos(a) * radius + up * math.sin(a) * radius)
                      for a in (2 * math.pi * k / ring for k in range(ring))])
    for a, b in zip(rings, rings[1:]):
        for k in range(ring):
            bm.faces.new([a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]])
    bm.loops.layers.uv.new("UVMap")
    return bm


def sweep(path, section, steps, ring, closed=False, cap=True):
    """Sweep a cross-section along a path. path(t) -> (point, side, up) for t in [0, 1]; section(t, a) -> (u, v)
    offsets along side/up for ring angle a. Returns a bmesh with smooth quads (and end caps when open)."""
    bm = bmesh.new()
    rings = []
    count = steps if closed else steps + 1
    for i in range(count):
        t = i / steps
        point, side, up = path(t)
        ring_verts = []
        for k in range(ring):
            a = 2 * math.pi * k / ring
            u, v = section(t, a)
            ring_verts.append(bm.verts.new(point + side * u + up * v))
        rings.append(ring_verts)
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for a, b in pairs:
        for k in range(ring):
            bm.faces.new([a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]])
    if cap and not closed:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bm.loops.layers.uv.new("UVMap")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def build_scarf():
    """Stylised rebuild of Sussy's neck scarf in Torso space (Roblox axes: y up, front is -z, character's left is -x;
    the torso is 2 x 2 x 1, its top at y = 1)."""
    up_axis = Vector((0, 1, 0))
    parts = []

    # 1) Thick wrap round the neck: an elliptical ring, lower at the front, with soft fabric bulges.
    def wrap_path(t):
        a = 2 * math.pi * t
        point = Vector((0.8 * math.cos(a), 1.04 + 0.07 * math.sin(a), 0.62 * math.sin(a)))
        tangent = Vector((-0.8 * math.sin(a), 0.07 * math.cos(a), 0.62 * math.cos(a))).normalized()
        outward = tangent.cross(up_axis).normalized()
        if outward.dot(Vector((point.x, 0, point.z))) < 0:
            outward = -outward
        return point, outward, outward.cross(tangent).normalized() * (1 if outward.cross(tangent).y > 0 else -1)

    def wrap_section(t, a):
        bulge = 1 + 0.13 * math.sin(6 * 2 * math.pi * t + 0.8) + 0.06 * math.sin(11 * 2 * math.pi * t)
        return 0.36 * bulge * math.cos(a), 0.42 * bulge * math.sin(a)

    parts.append(sweep(wrap_path, wrap_section, 96, 16, closed=True))

    # 2) Drape over the chest: a fuller, flatter roll below the wrap, front half only, tapering at the sides.
    def drape_path(t):
        a = math.pi * (1.12 + 0.76 * t)  # front arc (sin a < 0)
        point = Vector((0.9 * math.cos(a), 0.74 + 0.04 * math.cos(3 * a), 0.7 * math.sin(a) - 0.02))
        tangent = Vector((-0.9 * math.sin(a), 0, 0.7 * math.cos(a))).normalized()
        outward = tangent.cross(up_axis).normalized()
        if outward.dot(Vector((point.x, 0, point.z))) < 0:
            outward = -outward
        return point, outward, up_axis

    def drape_section(t, a):
        taper = math.sin(math.pi * t) ** 0.6
        fold = 1 + 0.12 * math.sin(5 * math.pi * t)
        return 0.14 * taper * fold * math.cos(a) + 0.04, 0.26 * taper * fold * math.sin(a)

    parts.append(sweep(drape_path, drape_section, 48, 14))

    # 3) Tail hanging down the character's left front, a soft ribbon that sways and narrows to its hem.
    def tail_path(t):
        point = Vector((-0.5 - 0.16 * t + 0.05 * math.sin(3 * math.pi * t), 0.92 - 1.7 * t,
                        -0.6 - 0.12 * math.sin(math.pi * t) - 0.04 * t))
        ahead = Vector((-0.16 + 0.05 * 3 * math.pi * math.cos(3 * math.pi * t), -1.7,
                        -0.12 * math.pi * math.cos(math.pi * t) - 0.04)).normalized()
        across = Vector((1, 0, 0.15)).normalized()
        across = (across - ahead * across.dot(ahead)).normalized()
        return point, across, across.cross(ahead).normalized()

    def tail_section(t, a):
        width = 0.34 - 0.08 * t + 0.03 * math.sin(4 * math.pi * t)
        thickness = 0.07 + 0.05 * (1 - t)
        ripple = 0.035 * math.sin(3 * a) * math.sin(math.pi * t)
        return width * math.cos(a), thickness * math.sin(a) + ripple

    parts.append(sweep(tail_path, tail_section, 40, 20))

    bm = bmesh.new()
    for piece in parts:
        mesh = bpy.data.meshes.new("scarf_piece")
        piece.to_mesh(mesh)
        piece.free()
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    bm.normal_update()
    return bm


def rounded_box(size, bevel):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, profile=0.5, affect="EDGES", clamp_overlap=True)
    bm.loops.layers.uv.new("UVMap")
    return bm


def box(size):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.008, segments=1, affect="EDGES")
    bm.loops.layers.uv.new("UVMap")
    return bm


class Group:
    def __init__(self, name):
        self.name = name
        self.pieces = []  # (bmesh, material, matrix, smooth_angle)

    def add(self, bm, material, matrix, angle=35, subdivide=0):
        self.pieces.append((bm, material, matrix, angle, subdivide))

    def build(self):
        objects = []
        for i, (bm, material, matrix, angle, subdivide) in enumerate(self.pieces):
            original = VERTEX_NORMALS.pop(id(bm), None)
            bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
            for v in bm.verts:
                v.co = to_blender(v.co)
            bm.normal_update()
            mesh = bpy.data.meshes.new(f"{self.name}_{i}")
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(material)
            mesh.shade_smooth()
            if original:
                rotate = matrix.to_3x3()
                mesh.normals_split_custom_set_from_vertices([to_blender(rotate @ nv).normalized() for nv in original])
            else:
                mesh.set_sharp_from_angle(angle=math.radians(angle))
            obj = bpy.data.objects.new(f"{self.name}_{i}", mesh)
            bpy.context.scene.collection.objects.link(obj)
            if subdivide:
                mod = obj.modifiers.new("subdivide", "SUBSURF")
                mod.levels = subdivide
                with bpy.context.temp_override(object=obj, active_object=obj):
                    bpy.ops.object.modifier_apply(modifier=mod.name)
            objects.append(obj)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objects:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = self.name
        joined.data.name = self.name
        return joined


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(coll):
            if item.users == 0:
                coll.remove(item)
    MATS.clear()

    parts = json.load(open(os.path.join(SRC, "parts.json")))["parts"] + EXTRA_PARTS
    groups = {name: Group(name) for name in GROUP_CENTER}
    body = {"111111": mat("BodyBlack", "17171a", 0.5), "f8f8f8": mat("BodyWhite", "f2f2ef", 0.5),
            "635f62": mat("BodyGrey", "6b6870", 0.55)}

    for p in parts:
        mesh = p.get("mesh")
        mesh_id = "".join(ch for ch in mesh["id"] if ch.isdigit()) if mesh else ""
        if mesh_id in SKIP_MESHES:
            continue
        key, group_name = ACCESSORIES.get(mesh_id, (None, R6_PARTS.get(p["name"])))
        if not group_name:
            continue
        group = groups[group_name]
        matrix = Matrix.Translation(-GROUP_CENTER[group_name]) @ cframe_matrix(p["cframe"])
        if mesh:
            matrix = matrix @ Matrix.Translation(mesh["offset"])
        scale = mesh["scale"] if mesh else [1, 1, 1]
        if key == "Egg":
            # Single-sided like Roblox: the outer black shell only shows at the rim and through the eye holes.
            white = mat("EggWhite", "f4f4f1", 0.35, coat=0.35, cull=True)
            black = mat("EggInk", "0c0c0f", 0.45, cull=True)
            group.add(load_mesh("Egg", scale, keep=lambda v: v < 0.5), white, matrix, SMOOTH_ANGLE["Egg"])
            group.add(load_mesh("Egg", scale, keep=lambda v: v >= 0.5), black, matrix, SMOOTH_ANGLE["Egg"])
        elif key:
            look = {
                "Trilby": mat("Trilby", rough=0.58, image="trilby.png"),
                "Glasses": mat("Glasses", rough=0.3, image="glasses.png", coat=0.3),
                # Single-sided like Roblox: the cloth's inner layer must not show through with flipped shading.
                # Soft black fabric with a gentle gloss so the folds catch light against the black shirt
                # (a white sheen read as dust on the black cloth).
                "Scarf": mat("Scarf", "2a2a31", rough=0.52, cull=True),
                "TacBelts": mat("TacBelts", rough=0.45, image="tacbelts.png", cull=True),
            }[key]
            if key == "Scarf":
                group.add(build_scarf(), look, Matrix(), 180)
            else:
                group.add(load_mesh(key, scale, normals=key in ORIGINAL_NORMALS), look, matrix, SMOOTH_ANGLE[key])
        else:
            # Plain R6 block, softened with a small bevel so it catches light like Studio's plastic.
            group.add(rounded_box(p["size"], 0.045), body[p["color"]], matrix, 30)

    # Shirt graphic (silver cross necklace): the decal is auth-locked and not in the local cache.
    torso = groups["Torso"]
    silver = mat("Silver", "d8dade", 0.2, metal=1.0)
    torso.add(tube([(-0.42, 0.85, -0.52), (-0.2, 0.45, -0.515), (0.0, 0.25, -0.515)], 0.016), silver, Matrix(), 60)
    torso.add(tube([(0.42, 0.85, -0.52), (0.2, 0.45, -0.515), (0.0, 0.25, -0.515)], 0.016), silver, Matrix(), 60)
    torso.add(box((0.07, 0.46, 0.035)), silver, Matrix.Translation((0, 0.0, -0.522)), 30)
    torso.add(box((0.3, 0.07, 0.035)), silver, Matrix.Translation((0, 0.12, -0.522)), 30)

    for g in groups.values():
        g.build()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_image_format="WEBP", export_image_quality=88,
                              export_materials="EXPORT")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, "sussy-r6.blend"), copy=True)
    print("exported", OUT, os.path.getsize(OUT), "bytes")


main()
