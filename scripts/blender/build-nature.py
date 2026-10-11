# Build the sunset-hill vegetation in Blender and export public/models/nature/nature.glb.
#
# Objects (all at the origin, Roblox-style Y-up after the glTF export, units in studs):
#   TreeTrunk  stylised oak: tapered trunk with root flare and branches
#   TreeCanopy soft foliage clumps; vertex colours bake occlusion and the warm sunset rim light
#   Bush       a noisy foliage blob, instanced around the hill
#   GrassClump a tuft of curved, tapered blades (vertex colour root -> tip), instanced thousands of times
#   Fern       a curved frond with leaflets, instanced along the road and around the tree
#
# Vertex colours carry the shading variation so the web only needs one cheap material per object.
# Run: blender -b -P scripts/blender/build-nature.py   (or send to the Blender MCP addon), then npm run optimize:nature
import math
import os
import random

import bmesh
import bpy
from mathutils import Color, Matrix, Vector, noise

# Repo root: two levels above this file when run with `blender -P`; PORTFOLIO_ROOT when sent to a running Blender.
_HERE = globals().get("__file__")
ROOT = os.environ.get("PORTFOLIO_ROOT") or (os.path.abspath(os.path.join(os.path.dirname(_HERE), "../..")) if _HERE else os.getcwd())
OUT = os.path.join(ROOT, "public/models/nature/nature.glb")
random.seed(7)


def to_blender(v):
    """Author in Roblox space (x, y-up, z) and convert to Blender (x, -z, y)."""
    return Vector((v[0], -v[2], v[1]))


def finish(name, bm, colors, material):
    """colors: dict BMLoop -> (r,g,b) or callable(vert)->(r,g,b). Converts to Blender space and links."""
    color_layer = bm.loops.layers.color.new("Col")
    for face in bm.faces:
        for loop in face.loops:
            c = colors(loop.vert.co) if callable(colors) else colors
            loop[color_layer] = (*c, 1.0)
    for v in bm.verts:
        v.co = to_blender(v.co)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def vertex_material(name, rough=0.85, double=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not double
    nodes = m.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    m.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


# ---------------------------------------------------------------------------------------------- tree

def tapered_tube(bm, points, radii, ring=12, twist=0.0):
    """Sweep a circle along points with per-point radius; returns the rings (lists of verts)."""
    pts = [Vector(p) for p in points]
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        side = t.cross(ref).normalized()
        up = side.cross(t).normalized()
        ring_verts = []
        for k in range(ring):
            a = 2 * math.pi * k / ring + twist * i
            bark = 1 + 0.08 * noise.noise(Vector((p.x * 3, p.y * 3 + k, p.z * 3)))
            ring_verts.append(bm.verts.new(p + (side * math.cos(a) + up * math.sin(a)) * radii[i] * bark))
        rings.append(ring_verts)
    for a, b in zip(rings, rings[1:]):
        for k in range(ring):
            bm.faces.new([a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]])
    bm.faces.new(rings[-1][::-1])
    return rings


def curve(start, direction, length, bend, steps):
    pts = []
    p = Vector(start)
    d = Vector(direction).normalized()
    for i in range(steps + 1):
        pts.append(p.copy())
        d = (d + Vector(bend) * (1 / steps)).normalized()
        p = p + d * (length / steps)
    return pts


def build_tree():
    bm = bmesh.new()
    bark_dark, bark_light = (0.16, 0.1, 0.07), (0.33, 0.22, 0.15)
    trunk = curve((0, -0.4, 0), (0.05, 1, 0.02), 6.2, (0.25, 0, -0.1), 14)
    radii = [0.95 * (1 - i / 16) ** 1.2 + 0.18 for i in range(len(trunk))]
    radii[0] *= 1.45
    radii[1] *= 1.2
    tapered_tube(bm, trunk, radii, ring=14, twist=0.12)
    # Root flare.
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.4
        root = curve((math.cos(a) * 0.5, 0.35, math.sin(a) * 0.5), (math.cos(a), -0.55, math.sin(a)), 1.6, (0, -0.4, 0), 5)
        tapered_tube(bm, root, [0.32 * (1 - i / 6) + 0.05 for i in range(len(root))], ring=8)
    # Branches leading into the canopy clumps.
    tips = []
    for k, (a, rise, length) in enumerate([(0.3, 0.65, 3.6), (2.2, 0.55, 3.2), (4.1, 0.6, 3.4), (5.4, 0.8, 2.6), (1.2, 0.9, 2.2)]):
        base = trunk[9 + k % 3]
        d = Vector((math.cos(a), rise, math.sin(a)))
        branch = curve(base, d, length, (0, 0.5, 0), 7)
        tapered_tube(bm, branch, [0.34 * (1 - i / 8) + 0.06 for i in range(len(branch))], ring=9)
        tips.append(branch[-1])
    tips.append(trunk[-1])
    bark = lambda co: lerp(bark_dark, bark_light, max(0.0, min(1.0, 0.45 + 0.5 * noise.noise(co * 2.5))))
    finish("TreeTrunk", bm, bark, vertex_material("Bark", 0.95))

    # Canopy: soft, rounded foliage clumps (smooth icospheres with gentle low-frequency noise) arranged as a dome.
    bm = bmesh.new()
    crown = Vector((0.5, 8.4, 0))
    clumps = [(tip + Vector((0, 0.5, 0)), 1.7 + random.random() * 0.5) for tip in tips]
    for k in range(12):
        a = k / 12 * math.pi * 2 + random.random() * 0.3
        ring = k % 2
        r = 2.6 + ring * 1.0 + random.random() * 0.5
        y = crown.y + (1.1 if ring else -0.4) + random.random() * 0.6
        clumps.append((Vector((crown.x + math.cos(a) * r, y, crown.z + math.sin(a) * r * 0.9)), 1.55 + random.random() * 0.5))
    clumps.append((crown + Vector((0, 1.9, 0)), 2.3))
    centers = []
    for center, size in clumps:
        geom = bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
        seed = Vector((random.random() * 50, random.random() * 50, random.random() * 50))
        for v in geom["verts"]:
            n = v.co.normalized()
            bump = noise.noise(n * 1.4 + seed) * 0.7 + noise.noise(n * 3.1 + seed) * 0.3
            v.co = center + Vector((n.x * 1.1, n.y * 0.82, n.z * 1.1)) * size * (1 + 0.14 * bump)
        centers.append((center, size))
    leaf_deep, leaf_dark, leaf_mid, leaf_warm = (0.03, 0.07, 0.03), (0.07, 0.15, 0.05), (0.2, 0.34, 0.09), (0.66, 0.52, 0.16)
    top = max(c.y + sz for c, sz in clumps)
    sun = Vector((0.26, 0.35, -1)).normalized()  # matches SUN_DIRECTION on the web (sunset behind, slightly right)

    def leaf(co):
        # Nearest clump gives a local normal; depth inside the crown gives cheap ambient occlusion.
        center, size = min(centers, key=lambda cs: (co - cs[0]).length - cs[1])
        n = (co - center).normalized()
        out = (co - crown)
        occlusion = max(0.0, min(1.0, out.length / 4.6))
        h = max(0.0, min(1.0, (co.y - 5.5) / (top - 5.5)))
        base = lerp(leaf_deep, lerp(leaf_dark, leaf_mid, h), 0.35 + 0.65 * occlusion)
        rim = max(0.0, n.dot(sun)) ** 1.6
        sky = max(0.0, n.y) * 0.25
        speckle = 0.08 * noise.noise(co * 2.3)
        return lerp(base, leaf_warm, min(0.85, rim * 0.8 + sky * h + speckle))

    finish("TreeCanopy", bm, leaf, vertex_material("Leaves", 0.85))
    bpy.ops.object.select_all(action="DESELECT")


# ---------------------------------------------------------------------------------------------- bush

def build_bush():
    bm = bmesh.new()
    for i in range(4):
        center = Vector(((i - 1.5) * 0.7, 0.55 + random.random() * 0.25, random.random() * 0.6 - 0.3))
        geom = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in geom["verts"]:
            n = v.co.normalized()
            bump = noise.noise(n * 1.6 + center) * 0.7 + noise.noise(n * 3.4 + center) * 0.3
            v.co = center + Vector((n.x, max(n.y, -0.35) * 0.8, n.z)) * 0.85 * (1 + 0.15 * bump)
    sun = Vector((0.26, 0.35, -1)).normalized()

    def bush_color(co):
        base = lerp((0.05, 0.11, 0.04), (0.24, 0.36, 0.1), max(0.0, min(1.0, co.y / 1.4)))
        rim = max(0.0, Vector((co.x, co.y - 0.6, co.z)).normalized().dot(sun)) ** 1.5
        return lerp(base, (0.62, 0.5, 0.16), rim * 0.7)

    finish("Bush", bm, bush_color, vertex_material("BushLeaves", 0.9))


# ---------------------------------------------------------------------------------------------- grass & fern

def blade(bm, base, angle, height, width, lean):
    """A tapered, curved blade (one quad strip) leaning outwards."""
    segments = 4
    out = Vector((math.cos(angle), 0, math.sin(angle)))
    side = Vector((-out.z, 0, out.x))
    prev = None
    for i in range(segments + 1):
        t = i / segments
        w = width * (1 - t) ** 0.8
        center = base + out * (lean * t * t) + Vector((0, height * t, 0))
        pair = (bm.verts.new(center - side * w), bm.verts.new(center + side * w))
        if prev:
            bm.faces.new([prev[0], prev[1], pair[1], pair[0]])
        prev = pair


def build_grass():
    bm = bmesh.new()
    for _ in range(11):
        a = random.random() * math.pi * 2
        r = random.random() * 0.18
        blade(bm, Vector((math.cos(a) * r, 0, math.sin(a) * r)), a, 0.55 + random.random() * 0.5, 0.035, 0.18 + random.random() * 0.2)
    finish("GrassClump", bm, lambda co: lerp((0.13, 0.2, 0.07), (0.66, 0.66, 0.3), max(0.0, min(1.0, co.y / 1.0))), vertex_material("Grass", 0.8, double=True))


def build_fern():
    bm = bmesh.new()
    for f in range(5):
        a = f / 5 * math.pi * 2 + random.random() * 0.4
        out = Vector((math.cos(a), 0, math.sin(a)))
        side = Vector((-out.z, 0, out.x))
        steps = 9
        length = 1.0 + random.random() * 0.35
        stem = [Vector((0, 0, 0)) + out * (length * i / steps) + Vector((0, 0.75 * math.sin(math.pi * 0.62 * i / steps), 0)) for i in range(steps + 1)]
        for i in range(1, steps):
            p, nxt = stem[i], stem[i + 1]
            leaflet = 0.22 * math.sin(math.pi * i / steps) + 0.03
            for sgn in (-1, 1):
                tip = p + side * sgn * leaflet + (nxt - p) * 0.6 + Vector((0, -0.04, 0))
                bm.faces.new([bm.verts.new(p), bm.verts.new(nxt), bm.verts.new(tip)])
    finish("Fern", bm, lambda co: lerp((0.1, 0.2, 0.06), (0.45, 0.55, 0.16), max(0.0, min(1.0, co.y / 0.8))), vertex_material("Fern", 0.8, double=True))


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials):
        for item in list(coll):
            if item.users == 0:
                coll.remove(item)
    build_tree()
    build_bush()
    build_grass()
    build_fern()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_attributes=True, export_materials="EXPORT")
    print("exported", OUT, os.path.getsize(OUT), "bytes", [(o.name, len(o.data.polygons)) for o in bpy.data.objects])


main()
