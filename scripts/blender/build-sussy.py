# Import the "Sussy" Roblox model into Blender, polish it, and export an R6-rigged GLB for the website.
#
# Source model: `R6_SussySuspector_1265476893` in Roblox Studio (classic R6 rig).
#   assets-src/sussy/parts.json    part transforms, sizes and SpecialMesh data dumped from Studio
#                                  (relative to HumanoidRootPart)
#   assets-src/sussy/meshes/*.json original Roblox meshes decoded with scripts/rbxmesh-to-json.mjs
#                                  (from assetdelivery or Studio's local content cache)
#   assets-src/sussy/textures/*    original textures (cache KTX2 decoded to PNG) + the face decal
#
# Quality pass only: original geometry is kept; we weld duplicate vertices, rebuild normals with
# angle-based smoothing (Draco meshes ship without normals) and assign PBR materials.
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


def load_mesh(name, scale, keep=None):
    """Load a decoded Roblox mesh; `keep(v)` filters triangles by their mean (Blender-space) UV v."""
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
            bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
            for v in bm.verts:
                v.co = to_blender(v.co)
            bm.normal_update()
            mesh = bpy.data.meshes.new(f"{self.name}_{i}")
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(material)
            mesh.shade_smooth()
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
                "Scarf": mat("Scarf", rough=0.66, image="scarf.png"),
                "TacBelts": mat("TacBelts", rough=0.45, image="tacbelts.png"),
            }[key]
            group.add(load_mesh(key, scale), look, matrix, SMOOTH_ANGLE[key])
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
