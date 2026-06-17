import math
import os
import sys

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit("Usage: blender --background --python render_model_icon.py -- <model> <output.png> [resolution]")
    args = argv[argv.index("--") + 1:]
    if len(args) < 2:
        raise SystemExit("Usage: blender --background --python render_model_icon.py -- <model> <output.png> [resolution]")
    model_path = os.path.abspath(args[0])
    output_path = os.path.abspath(args[1])
    resolution = int(args[2]) if len(args) >= 3 else 512
    return model_path, output_path, resolution


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_model(model_path):
    ext = os.path.splitext(model_path)[1].lower()
    if ext in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=model_path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=model_path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=model_path)
    else:
        raise SystemExit(f"Unsupported model format: {ext}")

    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        raise SystemExit("No mesh objects imported")
    return objects


def set_origin_and_scale(objects):
    min_v = Vector((math.inf, math.inf, math.inf))
    max_v = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)

    center = (min_v + max_v) * 0.5
    size = max_v - min_v
    longest = max(size.x, size.y, size.z, 0.001)
    scale = 2.15 / longest

    root = bpy.data.objects.new("IconRoot", None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        obj.parent = root
    root.location = -center
    root.scale = (scale, scale, scale)
    root.rotation_euler = (math.radians(12), 0, math.radians(-34))
    bpy.context.view_layer.update()
    return root


def improve_materials(objects):
    for obj in objects:
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if not bsdf:
                continue
            if "Metallic" in bsdf.inputs:
                bsdf.inputs["Metallic"].default_value = max(bsdf.inputs["Metallic"].default_value, 0.35)
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = min(max(bsdf.inputs["Roughness"].default_value, 0.34), 0.62)


def add_lighting():
    bpy.ops.object.light_add(type="AREA", location=(2.8, -3.4, 4.0))
    key = bpy.context.object
    key.name = "IconKeyLight"
    key.data.energy = 520
    key.data.size = 4.2

    bpy.ops.object.light_add(type="POINT", location=(-2.2, 2.4, 1.8))
    rim = bpy.context.object
    rim.name = "IconWarmRim"
    rim.data.energy = 58
    rim.data.color = (1.0, 0.62, 0.32)

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.color = (0.018, 0.016, 0.014)


def add_camera():
    bpy.ops.object.camera_add(location=(3.4, -4.6, 2.7), rotation=(math.radians(60), 0, math.radians(38)))
    camera = bpy.context.object
    camera.name = "IconCamera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.95
    bpy.context.scene.camera = camera
    return camera


def configure_render(output_path, resolution):
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    if "BLENDER_EEVEE_NEXT" in engines:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    elif "BLENDER_EEVEE" in engines:
        scene.render.engine = "BLENDER_EEVEE"
    else:
        scene.render.engine = "BLENDER_WORKBENCH"

    scene.render.film_transparent = True
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.filepath = output_path


def main():
    model_path, output_path, resolution = parse_args()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    clear_scene()
    objects = import_model(model_path)
    improve_materials(objects)
    set_origin_and_scale(objects)
    add_lighting()
    add_camera()
    configure_render(output_path, resolution)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered icon: {output_path}")


if __name__ == "__main__":
    main()
