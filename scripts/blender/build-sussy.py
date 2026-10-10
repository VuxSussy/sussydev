# Build the "Sussy" portfolio character in Blender and export an R6-style GLB.
#
# Source: the R15 model `R15_SussySuspector_1265476893` in Roblox Studio. Part transforms come from
# `assets-src/sussy/parts.json` (dumped from Studio), meshes from Roblox .mesh files converted with
# `scripts/rbxmesh-to-json.mjs`. Assets that need Roblox auth (blocky body, scarf, tac belts, shirt
# graphic) are rebuilt procedurally to match Studio screenshots.
#
# R15 parts are merged into the six R6 groups (Torso, Head, RightArm, LeftArm, RightLeg, LeftLeg) so the
# R6 animation pack drives them. Geometry is authored in Roblox space (Y up, faces -Z, studs) relative to
# each R6 part centre, then converted to Blender space (x, -z, y) so the Y-up glTF export lands back in
# Roblox space.
#
# Run: `blender -b -P scripts/blender/build-sussy.py` or send the file to the Blender MCP addon.
import json
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = os.environ.get("PORTFOLIO_ROOT", os.path.expanduser("~/Documents/portfolio/site"))
SRC = os.path.join(ROOT, "assets-src/sussy")
OUT = os.path.join(ROOT, "public/models/sussy/sussy-r6.glb")

GROUP_CENTER = {
    "Torso": Vector((0, 0, 0)), "Head": Vector((0, 1.5, 0)),
    "RightArm": Vector((1.5, 0, 0)), "LeftArm": Vector((-1.5, 0, 0)),
    "RightLeg": Vector((0.5, -2, 0)), "LeftLeg": Vector((-0.5, -2, 0)),
}
# 4546389367 is an invisible accessory (fully transparent texture) and is skipped.
MESH_FILES = {"3963788594": "trilby", "4820755895": "glasses"}
SKIP_MESHES = {"4546389367"}
GROUP_SIZE = {"Torso": (2, 2, 1), "RightArm": (1, 2, 1), "LeftArm": (1, 2, 1), "RightLeg": (1, 2, 1), "LeftLeg": (1, 2, 1)}


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


MATS = {}


def load_rgba(file):
    # Re-encode as 8-bit RGBA: grayscale / 1-bit PNGs otherwise export as empty glTF images.
    src = bpy.data.images.load(os.path.join(SRC, file), check_existing=False)
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


def mat(name, color="ffffff", rough=0.7, metal=0.0, image=None, clearcoat=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*lin(hex_rgb(color)), 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    bsdf.inputs["Coat Weight"].default_value = clearcoat
    if image:
        tex = m.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = load_rgba(image)
        m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    MATS[name] = m
    return m


class Group:
    """Collects geometry for one R6 part in its local Roblox space."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.materials = []

    def mat_index(self, m):
        if m not in self.materials:
            self.materials.append(m)
        return self.materials.index(m)

    def add_bmesh(self, src, m, matrix):
        """Append another bmesh (already in Roblox part space) transformed by matrix."""
        idx = self.mat_index(m)
        src_uv = src.loops.layers.uv.active
        vmap = {}
        for v in src.verts:
            vmap[v] = self.bm.verts.new(matrix @ v.co)
        for f in src.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            nf.material_index = idx
            nf.smooth = f.smooth
            if src_uv:
                for l_new, l_old in zip(nf.loops, f.loops):
                    l_new[self.uv].uv = l_old[src_uv].uv

    def finish(self):
        for v in self.bm.verts:
            v.co = to_blender(v.co)
        self.bm.normal_update()
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for m in self.materials:
            mesh.materials.append(m)
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        mod = obj.modifiers.new("smooth", "WEIGHTED_NORMAL")
        mod.keep_sharp = True
        return obj


def mesh_from_json(path, scale):
    data = json.load(open(path))
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    p = data["position"]
    verts = [bm.verts.new((p[i] * scale[0], p[i + 1] * scale[1], p[i + 2] * scale[2])) for i in range(0, len(p), 3)]
    idx, uvs = data["index"], data["uv"]
    for t in range(0, len(idx), 3):
        tri = idx[t:t + 3]
        try:
            f = bm.faces.new([verts[i] for i in tri])
        except ValueError:
            continue
        f.smooth = True
        for loop, i in zip(f.loops, tri):
            loop[uv].uv = (uvs[i * 2], 1 - uvs[i * 2 + 1]) if uvs else (0.5, 0.5)
    return bm


def rounded_box(size, bevel=0.05, segments=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)
    for f in bm.faces:
        f.smooth = True
    bm.loops.layers.uv.new("UVMap")
    return bm


def tube(points, radius, ring=10, flat=1.0, taper=None):
    """Swept tube along points (Roblox space). flat squashes the cross-section (cloth)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(Vector((0, 0, 1))) if abs(t.z) < 0.9 else t.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(t).normalized()
        r = radius * (taper[i] if taper else 1)
        rings.append([bm.verts.new(p + side * math.cos(a) * r + up * math.sin(a) * r * flat)
                      for a in (2 * math.pi * k / ring for k in range(ring))])
    for a, b in zip(rings, rings[1:]):
        for k in range(ring):
            f = bm.faces.new([a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]])
            f.smooth = True
    for cap in (rings[0], rings[-1][::-1]):
        bm.faces.new(cap[::-1] if cap is rings[0] else cap)
    bm.normal_update()
    bm.loops.layers.uv.new("UVMap")
    return bm


def torus(major, minor, center, scale=(1, 1, 1), rot_x=0.0, seg=36, ring=12):
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        c = Vector((math.cos(a) * major, 0, math.sin(a) * major))
        n = Vector((math.cos(a), 0, math.sin(a)))
        rings.append([bm.verts.new(c + n * math.cos(b) * minor + Vector((0, math.sin(b) * minor, 0)))
                      for b in (2 * math.pi * k / ring for k in range(ring))])
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for k in range(ring):
            f = bm.faces.new([a[k], b[k], b[(k + 1) % ring], a[(k + 1) % ring]])
            f.smooth = True
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot_x, 3, "X"))
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    bm.normal_update()
    bm.loops.layers.uv.new("UVMap")
    return bm


def head_uv_project(bm):
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        front = f.normal.z < -0.2
        for loop in f.loops:
            x, y = loop.vert.co.x, loop.vert.co.y
            loop[uv].uv = ((0.6 - x) / 1.2, (y + 0.6) / 1.2) if front else (0.02, 0.98)


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(coll):
            if item.users == 0:
                coll.remove(item)
    MATS.clear()

    parts = json.load(open(os.path.join(SRC, "parts.json")))["parts"]
    groups = {name: Group(name) for name in GROUP_CENTER}
    body_color = {"111111": "16161a", "f8f8f8": "f4f4f2", "635f62": "6b6870"}

    for p in parts:
        group = groups[p["group"]]
        center = GROUP_CENTER[p["group"]]
        world = Matrix.Translation(-center) @ cframe_matrix(p["cframe"])
        size = Vector(p["size"])
        mesh_id = "".join(ch for ch in p["meshId"] if ch.isdigit())
        if mesh_id in SKIP_MESHES:
            continue
        name = p["name"].split("/")[0]
        if p["name"] == "Head":
            bm = mesh_from_json(os.path.join(SRC, "head.mesh.json"), (1, 1, 1))
            bm.normal_update()
            head_uv_project(bm)
            group.add_bmesh(bm, mat("Face", "ffffff", 0.45, image="face.png", clearcoat=0.3), world)
        elif mesh_id in MESH_FILES:
            key = MESH_FILES[mesh_id]
            scale = [s / m for s, m in zip(p["size"], p["meshSize"])]
            bm = mesh_from_json(os.path.join(SRC, f"{key}.mesh.json"), scale)
            look = {"trilby": mat("Trilby", "ffffff", 0.55, image="trilby.png"),
                    "glasses": mat("Glasses", "ffffff", 0.35, image="glasses.png", clearcoat=0.6)}[key]
            group.add_bmesh(bm, look, world)
        elif p["group"] in GROUP_SIZE and "Accessory" not in name and not getattr(group, "has_body", False):
            # Blocky R15 segments line up exactly with the R6 part, so one rounded box reads cleaner.
            color = body_color.get(p["color"], p["color"])
            group.add_bmesh(rounded_box(GROUP_SIZE[p["group"]], bevel=0.07, segments=3), mat(f"Body_{color}", color, 0.62), Matrix())
            group.has_body = True

    # Procedural rebuilds of auth-locked accessories (Torso space).
    torso = groups["Torso"]
    scarf = mat("Scarf", "151518", 0.42, clearcoat=0.25)
    torso.add_bmesh(torus(0.74, 0.27, (0, 1.02, -0.02), (1.08, 1, 0.92), 0.05), scarf, Matrix())
    torso.add_bmesh(torus(0.64, 0.22, (0, 1.32, -0.04), (1.0, 1, 0.92), -0.08), scarf, Matrix())
    torso.add_bmesh(tube([(-0.52, 0.95, -0.62), (-0.66, 0.5, -0.66), (-0.78, 0.0, -0.62), (-0.86, -0.45, -0.58), (-0.92, -0.72, -0.56)],
                         0.3, ring=12, flat=0.22, taper=[1.0, 1.08, 1.12, 1.0, 0.7]), scarf, Matrix())
    torso.add_bmesh(tube([(-0.25, 0.95, 0.6), (-0.3, 0.45, 0.62), (-0.32, 0.0, 0.6), (-0.3, -0.42, 0.58)],
                         0.2, ring=10, flat=0.25, taper=[1.0, 1.05, 0.95, 0.6]), scarf, Matrix())
    silver = mat("Silver", "d8dade", 0.22, metal=1.0)
    torso.add_bmesh(tube([(-0.42, 0.85, -0.52), (-0.2, 0.45, -0.515), (0.0, 0.25, -0.515)], 0.018, ring=6), silver, Matrix())
    torso.add_bmesh(tube([(0.42, 0.85, -0.52), (0.2, 0.45, -0.515), (0.0, 0.25, -0.515)], 0.018, ring=6), silver, Matrix())
    torso.add_bmesh(rounded_box((0.07, 0.46, 0.04), 0.01), silver, Matrix.Translation((0, 0.0, -0.525)))
    torso.add_bmesh(rounded_box((0.3, 0.07, 0.04), 0.01), silver, Matrix.Translation((0, 0.12, -0.525)))
    belt = mat("Belt", "1c1c1f", 0.5)
    for size, pos in [((2.08, 0.17, 0.05), (0, -0.82, -0.53)), ((2.08, 0.17, 0.05), (0, -0.82, 0.53)),
                      ((0.05, 0.17, 1.1), (1.04, -0.82, 0)), ((0.05, 0.17, 1.1), (-1.04, -0.82, 0))]:
        torso.add_bmesh(rounded_box(size, 0.015), belt, Matrix.Translation(pos))
    for x in (1.07, -1.07):
        torso.add_bmesh(rounded_box((0.16, 0.42, 0.3), 0.04), belt, Matrix.Translation((x, -1.0, 0.05)))
    gold = mat("Badge", "b8964c", 0.3, metal=0.9)
    torso.add_bmesh(torus(0.11, 0.035, (0, 0, 0), (1, 1, 1), math.pi / 2, 20, 8), gold, Matrix.Translation((0.2, -0.82, -0.58)))
    torso.add_bmesh(rounded_box((0.16, 0.2, 0.03), 0.02), gold, Matrix.Translation((0.2, -0.82, -0.58)))
    steel = mat("Steel", "8e9399", 0.3, metal=1.0)
    for dx in (0.0, 0.14):
        torso.add_bmesh(torus(0.085, 0.025, (0, 0, 0), (1, 1, 1), math.pi / 2, 20, 8), steel, Matrix.Translation((0.62 + dx, -0.86, -0.59)))
    torso.add_bmesh(rounded_box((0.16, 0.08, 0.04), 0.01), steel, Matrix.Translation((-0.25, -0.82, -0.575)))

    for g in groups.values():
        g.finish()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_image_format="WEBP", export_materials="EXPORT")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, "sussy-r6.blend"), copy=True)
    print("exported", OUT, os.path.getsize(OUT), "bytes")


main()
