# Build the studio's floating toolbox props in Blender and export public/models/props/props.glb.
#
# Objects (each centred on its own origin, real-world size in metres; the web scales them up):
#   ClawHammer   steel head (chamfered face, neck, split curved claw) on a tapered oval ash handle with a rubber grip
#   Sledgehammer painted octagonal head with polished striking faces, long hickory handle
#   Wrench       chrome combination spanner: 12-point ring end, 15-degree open end, I-beam shaft
#   Screwdriver  fluted two-tone handle, steel shaft, Phillips-style tip
#   Brick2x4     classic Roblox/toy brick in studs (4 x 1.2 x 2) with bevelled edges and real studs on top
#   Brick2x2     the 2 x 2 version
#
# Bricks use one white "Plastic" material so the web can tint each instance. Tools use a few shared PBR
# materials (Principled BSDF -> glTF metallic/roughness). Standard prop tier: ~0.5k-2k triangles each.
# Run: blender -b -P scripts/blender/build-props.py   (or npm run build:props, which also meshopt-compresses it)
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

_HERE = globals().get("__file__")
ROOT = os.environ.get("PORTFOLIO_ROOT") or (os.path.abspath(os.path.join(os.path.dirname(_HERE), "../..")) if _HERE else os.getcwd())
OUT = os.path.join(ROOT, "public/models/props/props.glb")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, rough=0.5):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = True  # closed meshes: single-sided in glTF
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*srgb(color), 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    return m


def srgb(hex_color):
    h = hex_color.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def mesh_object(name, bm, mat):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def apply_modifiers(obj):
    """Bake the modifier stack into the mesh without operators (safe in background mode)."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated)
    old = obj.data
    obj.modifiers.clear()
    obj.data = mesh
    bpy.data.meshes.remove(old)
    return obj


def bevel(obj, width, segments=2, angle=40):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = True
    return mod


def cylinder(name, mat, radius, depth, verts=24, matrix=Matrix(), radius_top=None, scale_x=1.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=radius,
                          radius2=radius if radius_top is None else radius_top, depth=depth)
    bmesh.ops.scale(bm, vec=Vector((scale_x, 1, 1)), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return mesh_object(name, bm, mat)


def box(name, mat, size, matrix=Matrix()):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return mesh_object(name, bm, mat)


def join(name, parts):
    """Merge parts (modifiers applied) into one object; materials become glTF primitives."""
    for p in parts:
        apply_modifiers(p)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    # Origin at the bounding-box centre so the web can spin it about its middle.
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def at(x, y, z):
    return Matrix.Translation((x, y, z))


# --- Materials -------------------------------------------------------------------------------------------------
STEEL = lambda: material("Steel", "#c9ced6", metallic=1.0, rough=0.28)
DARK_STEEL = lambda: material("DarkSteel", "#4a5059", metallic=0.9, rough=0.42)
PAINT = lambda: material("PaintRed", "#c23a2b", metallic=0.15, rough=0.38)
WOOD = lambda: material("Ash", "#c08a55", metallic=0.0, rough=0.62)
HICKORY = lambda: material("Hickory", "#9c6a3e", metallic=0.0, rough=0.6)
RUBBER = lambda: material("Rubber", "#1d2026", metallic=0.0, rough=0.85)
GRIP = lambda: material("GripBlue", "#2f7de1", metallic=0.0, rough=0.45)
GRIP_ACCENT = lambda: material("GripYellow", "#f2c230", metallic=0.0, rough=0.45)
PLASTIC = lambda: material("Plastic", "#ffffff", metallic=0.0, rough=0.42)


def claw_prong(side, top, length=0.085, steps=10):
    bm = bmesh.new()
    bend = 0.95
    radius = length / bend
    rings = []
    for k in range(steps + 1):
        t = k / steps
        theta = bend * t
        cx = 0.018 + radius * math.sin(theta)
        cz = top - radius * (1 - math.cos(theta))
        normal = Vector((math.sin(theta), 0, math.cos(theta)))
        half_z = 0.011 * (1 - 0.72 * t)
        half_y = 0.0048 * (1 - 0.35 * t)
        cy = side * (0.0052 + 0.0045 * t)
        centre = Vector((cx, cy, cz))
        rings.append([bm.verts.new(centre + normal * (sz * half_z) + Vector((0, sy * half_y, 0)))
                      for sy, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            bm.faces.new((a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_object("prong", bm, STEEL())
    bevel(obj, 0.0015, segments=1, angle=50)
    return obj


def claw_hammer():
    # Handle along +Z: 0..0.30 m, tapered oval, thicker towards the grip.
    handle = cylinder("handle", WOOD(), 0.0165, 0.27, verts=20, matrix=at(0, 0, 0.165), radius_top=0.012, scale_x=1.3)
    grip = cylinder("grip", RUBBER(), 0.0185, 0.11, verts=20, matrix=at(0, 0, 0.055), radius_top=0.0175, scale_x=1.3)
    bevel(grip, 0.004)
    knob = cylinder("knob", RUBBER(), 0.0195, 0.012, verts=20, matrix=at(0, 0, 0.006), scale_x=1.3)
    bevel(knob, 0.004)
    # Head along X at the top of the handle.
    top = 0.305
    eye = box("eye", STEEL(), (0.04, 0.026, 0.042), matrix=at(0.0, 0, top))
    bevel(eye, 0.004)
    neck = cylinder("neck", STEEL(), 0.0125, 0.04, verts=24, matrix=at(-0.038, 0, top) @ rot("Y", 90))
    face = cylinder("face", STEEL(), 0.0165, 0.026, verts=32, matrix=at(-0.068, 0, top) @ rot("Y", 90))
    bevel(face, 0.003, segments=2)
    # Claw: two prongs swept along a quarter arc that curls down towards the handle, tapering to thin tips.
    prongs = [claw_prong(side, top) for side in (-1, 1)]
    return join("ClawHammer", [handle, grip, knob, eye, neck, face, *prongs])


def sledgehammer():
    handle = cylinder("handle", HICKORY(), 0.017, 0.40, verts=20, matrix=at(0, 0, 0.2), radius_top=0.0145, scale_x=1.25)
    grip = cylinder("grip", RUBBER(), 0.0195, 0.12, verts=20, matrix=at(0, 0, 0.06), scale_x=1.25)
    bevel(grip, 0.004)
    top = 0.41
    head = cylinder("head", PAINT(), 0.034, 0.15, verts=8, matrix=at(0, 0, top) @ rot("Y", 90) @ rot("Z", 22.5))
    bevel(head, 0.004, segments=1, angle=30)
    faces = []
    for side in (-1, 1):
        f = cylinder("strike", DARK_STEEL(), 0.031, 0.014, verts=32, matrix=at(side * 0.082, 0, top) @ rot("Y", 90))
        bevel(f, 0.004, segments=2)
        faces.append(f)
    wedge = box("wedge", DARK_STEEL(), (0.012, 0.034, 0.008), matrix=at(0, 0, top + 0.034))
    return join("Sledgehammer", [handle, grip, head, *faces, wedge])


def wrench():
    length = 0.2
    shaft = box("shaft", STEEL(), (0.028, 0.01, length * 0.72), matrix=at(0, 0, 0))
    bevel(shaft, 0.003)
    # I-beam groove on both faces.
    grooves = [box("groove", DARK_STEEL(), (0.012, 0.0015, length * 0.5), matrix=at(0, s * 0.0047, 0)) for s in (-1, 1)]
    # Ring end (top): ring with a 12-point hole, tilted 15 degrees like a real offset ring.
    ring = cylinder("ring", STEEL(), 0.025, 0.012, verts=36, matrix=at(0, 0, length / 2) @ rot("X", 90))
    hole = cylinder("hole", STEEL(), 0.0125, 0.05, verts=12, matrix=at(0, 0, length / 2) @ rot("X", 90))
    cut = ring.modifiers.new("Hole", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.object = hole
    bevel(ring, 0.0018, segments=2, angle=30)
    # Open end (bottom): a jaw cut at 15 degrees.
    jaw = cylinder("jaw", STEEL(), 0.028, 0.011, verts=36, matrix=at(0, 0, -length / 2) @ rot("X", 90))
    slot = box("slot", STEEL(), (0.0175, 0.05, 0.06), matrix=at(0, 0, -length / 2 - 0.022) @ rot("Y", 15))
    cut = jaw.modifiers.new("Jaw", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.object = slot
    bevel(jaw, 0.0018, segments=2, angle=30)
    obj = join("Wrench", [shaft, *grooves, ring, jaw])
    for helper in (hole, slot):
        bpy.data.objects.remove(helper)
    return obj


def screwdriver():
    # Fluted handle: a 24-point star profile extruded and capped, rounded at the back.
    bm = bmesh.new()
    ring_verts = []
    n = 24
    for i in range(n):
        a = i / n * math.tau
        r = 0.0165 if i % 2 == 0 else 0.0138
        ring_verts.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0.0)))
    face = bm.faces.new(ring_verts)
    bmesh.ops.reverse_faces(bm, faces=[face])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top_verts = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, 0.095), verts=top_verts)
    handle = mesh_object("handle", bm, GRIP())
    bevel(handle, 0.004, segments=3, angle=60)
    collar = cylinder("collar", GRIP_ACCENT(), 0.0125, 0.02, verts=24, matrix=at(0, 0, 0.104), radius_top=0.0085)
    shaft = cylinder("shaft", STEEL(), 0.0045, 0.1, verts=12, matrix=at(0, 0, 0.164))
    tip = cylinder("tip", STEEL(), 0.0045, 0.014, verts=4, matrix=at(0, 0, 0.221), radius_top=0.0006)
    return join("Screwdriver", [handle, collar, shaft, tip])


def brick(name, studs_x, studs_y):
    """A toy brick in studs: studs_x x 1.2 x studs_y (Blender X, Z-up height, Y), studs on top."""
    w, d, h = float(studs_x), float(studs_y), 1.2
    body = box("body", PLASTIC(), (w - 0.02, d - 0.02, h))
    bevel(body, 0.07, segments=3, angle=60)
    parts = [body]
    for i in range(studs_x):
        for j in range(studs_y):
            stud = cylinder("stud", PLASTIC(), 0.3, 0.2, verts=24, matrix=at(i - w / 2 + 0.5, j - d / 2 + 0.5, h / 2 + 0.1))
            bevel(stud, 0.035, segments=2, angle=60)
            parts.append(stud)
    return join(name, parts)


def main():
    reset()
    objects = [claw_hammer(), sledgehammer(), wrench(), screwdriver(), brick("Brick2x4", 4, 2), brick("Brick2x2", 2, 2)]
    for obj in objects:
        # Triangulated tris for the log; glTF triangulates anyway.
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f"{obj.name}: {tris} tris, materials={[m.name for m in obj.data.materials]}, size={tuple(round(v, 3) for v in obj.dimensions)}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_materials="EXPORT", export_texcoords=False)
    print("exported", OUT, os.path.getsize(OUT), "bytes")


main()
