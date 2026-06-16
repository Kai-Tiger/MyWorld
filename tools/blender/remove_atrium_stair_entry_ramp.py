from pathlib import Path

import bpy


ROOT = Path.cwd()
MASTER_BLEND = ROOT / "assets" / "blender" / "castle_master.blend"
RAMP_NAME = "COL_RAMP_ATRIUM_SPIRAL_STAIR_ENTRY"


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER_BLEND))

    obj = bpy.data.objects.get(RAMP_NAME)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)
        print(f"Removed {RAMP_NAME}")
    else:
        print(f"{RAMP_NAME} not found")

    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
    print(f"Saved {MASTER_BLEND}")


if __name__ == "__main__":
    main()
