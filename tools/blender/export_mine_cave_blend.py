import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path.cwd()
SOURCE_BLEND = ROOT / "assets" / "blender" / "mine_cave.blend"
OUT_DIR = ROOT / "public" / "models" / "mine_cave"
OUT_GLB = OUT_DIR / "mine_cave.glb"
OUT_MANIFEST = OUT_DIR / "mine_cave_colliders.json"
BUILD_VERSION = 1


def round4(value):
    return round(float(value), 4)


def open_source_blend():
    if Path(bpy.data.filepath).resolve() != SOURCE_BLEND.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))


def game_xy_from_blender(vec):
    return round4(vec.x), round4(-vec.y)


def game_axis_from_blender(vec):
    axis = Vector((vec.x, -vec.y))
    if axis.length == 0:
        return (1.0, 0.0)
    axis.normalize()
    return round4(axis.x), round4(axis.y)


def world_bbox(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return corners


def local_bbox_size(obj):
    corners = [Vector(corner) for corner in obj.bound_box]
    min_v = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    max_v = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return max_v - min_v


def export_custom_shape(obj):
    if obj.get("game_x") is None or obj.get("game_z") is None:
        return None

    shape = {
        "name": obj.name,
        "x": round4(obj["game_x"]),
        "z": round4(obj["game_z"]),
        "hx": round4(obj["game_hx"]),
        "hz": round4(obj["game_hz"]),
    }
    ux = round4(obj.get("game_ux", 1.0))
    uz = round4(obj.get("game_uz", 0.0))
    vx = round4(obj.get("game_vx", 0.0))
    vz = round4(obj.get("game_vz", 1.0))
    if abs(ux - 1.0) > 0.0001 or abs(uz) > 0.0001 or abs(vx) > 0.0001 or abs(vz - 1.0) > 0.0001:
        shape.update({"ux": ux, "uz": uz, "vx": vx, "vz": vz})

    if obj.name.startswith("COL_SURFACE_"):
        shape["surface"] = True
        shape["h"] = round4(obj["game_h"])
    elif obj.name.startswith("COL_WALL_"):
        shape["minY"] = round4(obj["game_minY"])
        shape["maxY"] = round4(obj["game_maxY"])
    if obj.get("game_clearancePathId") is not None:
        shape["clearancePathId"] = str(obj["game_clearancePathId"])
    return shape


def export_box_shape(obj):
    custom_shape = export_custom_shape(obj)
    if custom_shape is not None:
        return custom_shape

    matrix = obj.matrix_world
    center = matrix.translation
    basis = matrix.to_3x3()
    size = local_bbox_size(obj)
    axis_x = basis @ Vector((1, 0, 0))
    axis_y = basis @ Vector((0, 1, 0))
    x, z = game_xy_from_blender(center)
    ux, uz = game_axis_from_blender(axis_x)
    vx, vz = game_axis_from_blender(axis_y)
    corners = world_bbox(obj)

    shape = {
        "name": obj.name,
        "x": x,
        "z": z,
        "hx": round4(size.x * axis_x.length * 0.5),
        "hz": round4(size.y * axis_y.length * 0.5),
    }
    if abs(ux - 1.0) > 0.0001 or abs(uz) > 0.0001 or abs(vx) > 0.0001 or abs(vz - 1.0) > 0.0001:
        shape.update({"ux": ux, "uz": uz, "vx": vx, "vz": vz})

    if obj.name.startswith("COL_SURFACE_"):
        shape["surface"] = True
        shape["h"] = round4(max(c.z for c in corners))
    elif obj.name.startswith("COL_WALL_"):
        shape["minY"] = round4(min(c.z for c in corners))
        shape["maxY"] = round4(max(c.z for c in corners))
    return shape


def collect_manifest():
    colliders = []
    zones = []
    for obj in bpy.context.scene.objects:
        if not obj.name.startswith("COL_") or obj.type != "MESH":
            continue
        shape = export_box_shape(obj)
        if obj.name.startswith("COL_ZONE_"):
            zones.append(shape)
        else:
            colliders.append(shape)
    paths = []
    paths_json = bpy.context.scene.get("mine_cave_paths_json")
    if paths_json:
        parsed_paths = json.loads(paths_json)
        if isinstance(parsed_paths, list):
            paths = parsed_paths
    return {
        "version": 1,
        "buildVersion": BUILD_VERSION,
        "source": str(SOURCE_BLEND.relative_to(ROOT)),
        "model": "/models/mine_cave/mine_cave.glb",
        "colliders": colliders,
        "zones": zones,
        "paths": paths,
    }


def export_glb():
    selectable = [obj for obj in bpy.context.scene.objects if not obj.name.startswith("COL_") and obj.type in {"MESH", "EMPTY"}]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in selectable:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = selectable[0] if selectable else None
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )


def main():
    open_source_blend()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_glb()
    OUT_MANIFEST.write_text(json.dumps(collect_manifest(), indent=2), encoding="utf-8")
    print(f"Exported {OUT_GLB}")
    print(f"Exported {OUT_MANIFEST}")


if __name__ == "__main__":
    main()
