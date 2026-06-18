import json
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def natural_index(name, prefix):
    if name.startswith(prefix + "."):
        match = re.match(rf"{re.escape(prefix)}\.(\d+)_", name)
        if match:
            return int(match.group(1))
    return 0


def clean_name(name):
    name = re.sub(r"[^a-zA-Z0-9_]+", "_", name)
    return name.strip("_").lower()


def world_bounds(objects):
    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    min_v = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    max_v = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    return min_v, max_v


def duplicate_group(objects):
    duplicates = []
    for obj in objects:
        dup = obj.copy()
        dup.data = obj.data.copy()
        dup.matrix_world = obj.matrix_world.copy()
        bpy.context.collection.objects.link(dup)
        duplicates.append(dup)
    return duplicates


def export_group(asset_name, objects, out_dir):
    duplicates = duplicate_group(objects)
    bpy.context.view_layer.update()

    min_v, max_v = world_bounds(duplicates)
    center = (min_v + max_v) * 0.5
    offset = Vector((-center.x, -center.y, -min_v.z))
    for obj in duplicates:
        obj.matrix_world.translation += offset

    bpy.ops.object.select_all(action="DESELECT")
    for obj in duplicates:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = duplicates[0]

    filepath = out_dir / f"{asset_name}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,
    )

    bpy.ops.object.select_all(action="DESELECT")
    for obj in duplicates:
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(mesh, do_unlink=True)

    dims = max_v - min_v
    return {
        "file": filepath.name,
        "sourceObjects": [obj.name for obj in objects],
        "dimensions": [round(dims.x, 4), round(dims.y, 4), round(dims.z, 4)],
    }


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: blender --background --python export_forest_pack_assets.py -- <src.glb> <out_dir>")

    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    src = Path(argv[0]).expanduser()
    out_dir = Path(argv[1]).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.import_scene.gltf(filepath=str(src))
    bpy.context.view_layer.update()

    meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
    manifest = []

    atlas_prefix = "Background_Tree_Atlas"
    atlas_objects = sorted(
        [obj for name, obj in meshes.items() if name.startswith(atlas_prefix)],
        key=lambda obj: natural_index(obj.name, atlas_prefix),
    )
    for index, obj in enumerate(atlas_objects, start=1):
        manifest.append(export_group(f"background_tree_{index:02d}", [obj], out_dir))

    rock_prefix = "Rocks"
    rock_objects = sorted(
        [obj for name, obj in meshes.items() if name.startswith(rock_prefix)],
        key=lambda obj: natural_index(obj.name, rock_prefix),
    )
    for index, obj in enumerate(rock_objects, start=1):
        manifest.append(export_group(f"rock_{index:02d}", [obj], out_dir))

    tree_groups = [
        (
            "tree_01",
            [
                "Tree_Trunk_01.001_Tree_Trunk_01_0",
                "Tree_Branches_01_Tree_Branches_01_0",
            ],
        ),
        (
            "tree_02",
            [
                "Tree_Trunk_01.002_Tree_Trunk_01_0",
                "Tree_Branches_01.002_Tree_Branches_01_0",
            ],
        ),
        (
            "tree_03",
            [
                "Tree_Trunk_01_Tree_Trunk_01_0",
                "Tree_Branches_01.001_Tree_Branches_01_0",
            ],
        ),
        (
            "tree_04",
            [
                "Tree_Trunk_02_Tree_Trunk_02_0",
                "Tree_Branches_02_Tree_Branches_02_0",
            ],
        ),
    ]

    for asset_name, names in tree_groups:
        missing = [name for name in names if name not in meshes]
        if missing:
            raise RuntimeError(f"Missing objects for {asset_name}: {missing}")
        manifest.append(export_group(asset_name, [meshes[name] for name in names], out_dir))

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exported {len(manifest)} assets to {out_dir}")


if __name__ == "__main__":
    main()
