# Render the loader sprite: Sussy's bare egg head (no trilby, no glasses), front view, transparent PNG.
# Run: OUT=<dir> blender -b assets-src/sussy/sussy-r6.blend -P scripts/blender/render-egg-sprite.py
# then: sharp/cwebp to public/brand/sussy-egg.webp (256 px) and regenerate lib/brand.ts (inline data URI).
import bpy, bmesh, math, mathutils, os
OUT = os.environ["OUT"]
head = bpy.data.objects["Head"]
# Keep only the egg (white shell + black inverted hull): drop the trilby and the pixel glasses.
keep = {i for i, slot in enumerate(head.material_slots) if slot.material and slot.material.name.startswith("Egg")}
bm = bmesh.new(); bm.from_mesh(head.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index not in keep], context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(head.data); bm.free()
for m in bpy.data.materials:
    if m.name.startswith("Egg"): m.use_backface_culling = m.name != "EggWhite"
    if m.name == "EggInk":
        bsdf = m.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1)
        bsdf.inputs["Roughness"].default_value = 0.9
        bsdf.inputs["Specular IOR Level"].default_value = 0.1
for o in bpy.data.objects:
    if o.type == "MESH": o.hide_render = o.name != "Head"
    if o.type in ("CAMERA", "LIGHT"): bpy.data.objects.remove(o)
head.location = (0, 0, 0)
bpy.context.view_layer.update()
pts = [head.matrix_world @ v.co for v in head.data.vertices]
lo = mathutils.Vector([min(p[i] for p in pts) for i in range(3)]); hi = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
center = (lo + hi) / 2
size = max(hi.x - lo.x, hi.z - lo.z)
print("EGG bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi])
sc = bpy.context.scene
def light(name, rot, energy, color):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); l.data.energy = energy; l.data.color = color
    l.rotation_euler = rot; sc.collection.objects.link(l)
light("Key", (math.radians(50), 0, math.radians(30)), 4.2, (1, 0.98, 0.95))
light("Rim", (math.radians(-60), 0, math.radians(200)), 1.6, (0.75, 0.8, 1))
sc.world.use_nodes = True
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.42, 0.45, 1)
sc.world.node_tree.nodes["Background"].inputs[1].default_value = 1.9
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
cam.location = (center.x, center.y + 10, center.z)  # front of the face is +Y in Blender
cam.rotation_euler = (mathutils.Vector(center) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"; cam.data.ortho_scale = size * 1.08
sc.camera = cam; sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.filepath = os.path.join(OUT, "sussy-egg.png")
bpy.ops.render.render(write_still=True)
print("EGG ok")
