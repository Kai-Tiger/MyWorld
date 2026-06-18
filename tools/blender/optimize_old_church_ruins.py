import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "src/place/old_church_ruins.glb"
PRESETS = {
    "optimized": {
        "output": ROOT / "src/place/old_church_ruins_optimized.glb",
        "report": ROOT / "src/place/old_church_ruins_optimized_report.json",
        "large_ratio": 0.62,
        "medium_ratio": 0.75,
        "small_ratio": 1.0,
        "texture_max_size": None,
    },
    "medium": {
        "output": ROOT / "src/place/old_church_ruins_medium.glb",
        "report": ROOT / "src/place/old_church_ruins_medium_report.json",
        "large_ratio": 0.42,
        "medium_ratio": 0.55,
        "small_ratio": 0.72,
        "texture_max_size": 1024,
    },
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def mesh_stats(objects):
    meshes = [obj for obj in objects if obj.type == "MESH"]
    tris = 0
    vertices = 0
    materials = set()
    for obj in meshes:
        mesh = obj.data
        vertices += len(mesh.vertices)
        for poly in mesh.polygons:
            tris += max(1, len(poly.vertices) - 2)
        for slot in obj.material_slots:
            if slot.material:
                materials.add(slot.material.name)
    return {
        "objects": len(objects),
        "meshes": len(meshes),
        "vertices": vertices,
        "triangles": tris,
        "materials": len(materials),
    }


def apply_transforms(meshes):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    if meshes:
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def remove_non_meshes():
    for obj in list(bpy.context.scene.objects):
        if obj.type not in {"MESH", "EMPTY"}:
            bpy.data.objects.remove(obj, do_unlink=True)


def decimate_meshes(meshes, preset):
    for obj in meshes:
        tri_count = sum(max(1, len(poly.vertices) - 2) for poly in obj.data.polygons)
        if tri_count < 800:
            continue
        if tri_count > 25000:
            ratio = preset["large_ratio"]
        elif tri_count > 2500:
            ratio = preset["medium_ratio"]
        else:
            ratio = preset["small_ratio"]
        if ratio >= 0.99:
            continue
        mod = obj.modifiers.new("static_ruin_decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        finally:
            obj.select_set(False)


def join_by_material(meshes):
    buckets = {}
    for obj in meshes:
        mat = obj.material_slots[0].material if obj.material_slots and obj.material_slots[0].material else None
        key = mat.name if mat else "__no_material__"
        buckets.setdefault(key, []).append(obj)

    joined = []
    for key, bucket in buckets.items():
        if len(bucket) == 1:
            bucket[0].name = f"old_church_{key}"
            joined.append(bucket[0])
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in bucket:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = bucket[0]
        bpy.ops.object.join()
        joined_obj = bpy.context.view_layer.objects.active
        joined_obj.name = f"old_church_{key}"
        joined.append(joined_obj)
    return joined


def scale_images(max_size):
    if not max_size:
        return
    for image in bpy.data.images:
        if image.size[0] <= max_size and image.size[1] <= max_size:
            continue
        if image.packed_file:
            image.unpack(method="USE_LOCAL")
        scale = min(max_size / image.size[0], max_size / image.size[1])
        width = max(1, int(image.size[0] * scale))
        height = max(1, int(image.size[1] * scale))
        image.scale(width, height)


def compress_materials(preset):
    scale_images(preset["texture_max_size"])
    for image in bpy.data.images:
        try:
            image.colorspace_settings.name = "sRGB" if not image.is_float else "Non-Color"
        except TypeError:
            pass
    for mat in bpy.data.materials:
        mat.use_nodes = True


def export_glb(output):
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
    )


def main():
    preset_name = "optimized"
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]
        if args:
            preset_name = args[0]
    if preset_name not in PRESETS:
        raise SystemExit(f"Unknown preset {preset_name!r}; expected one of {', '.join(PRESETS)}")
    preset = PRESETS[preset_name]
    output = preset["output"]
    report_path = preset["report"]

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(INPUT))
    imported = list(bpy.context.scene.objects)
    before = mesh_stats(imported)

    remove_non_meshes()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    apply_transforms(meshes)
    decimate_meshes(meshes, preset)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    joined = join_by_material(meshes)
    compress_materials(preset)
    after = mesh_stats(list(bpy.context.scene.objects))
    export_glb(output)

    report = {
        "preset": preset_name,
        "input": str(INPUT.relative_to(ROOT)),
        "output": str(output.relative_to(ROOT)),
        "before": before,
        "after": after,
        "output_bytes": output.stat().st_size,
        "output_mb": round(output.stat().st_size / 1024 / 1024, 2),
        "texture_max_size": preset["texture_max_size"],
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
