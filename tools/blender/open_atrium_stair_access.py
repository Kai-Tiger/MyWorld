from pathlib import Path

import bpy


ROOT = Path.cwd()
MASTER_BLEND = ROOT / "assets" / "blender" / "castle_master.blend"


def split_rail_object(name, north_suffix="NORTH", south_suffix="SOUTH"):
    obj = bpy.data.objects.get(name)
    if not obj:
        print(f"Skipped missing object: {name}")
        return

    collection_links = list(obj.users_collection)
    north = obj.copy()
    north.data = obj.data.copy() if obj.data else None
    south = obj.copy()
    south.data = obj.data.copy() if obj.data else None

    north.name = f"{name}_{north_suffix}"
    south.name = f"{name}_{south_suffix}"

    # Blender Y maps to negative game Z. This leaves a gap from game z=-34..-24.
    north.location.y = 41
    south.location.y = 17
    north.dimensions.y = 14
    south.dimensions.y = 14

    for collection in collection_links:
        collection.objects.link(north)
        collection.objects.link(south)

    bpy.data.objects.remove(obj, do_unlink=True)
    print(f"Split {name} into {north.name} and {south.name}")


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER_BLEND))
    split_rail_object("VIS_ATRIUM_L1_ATRIUM_RAIL_W")
    split_rail_object("COL_BOX_ATRIUM_L1_ATRIUM_RAIL_W")
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
    print(f"Saved {MASTER_BLEND}")


if __name__ == "__main__":
    main()
