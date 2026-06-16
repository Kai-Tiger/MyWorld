from pathlib import Path

import bpy


ROOT = Path.cwd()
MASTER_BLEND = ROOT / "assets" / "blender" / "castle_master.blend"


def p3(x, y, z):
    return (x, -z, y)


def find_material(name_prefix):
    for material in bpy.data.materials:
        if material.name.startswith(name_prefix):
            return material
    return bpy.data.materials.get("Stone_Ash")


def add_box(collection, name, location, scale, material=None):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[2] / 2, scale[1] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def add_collision_box(collection, name, location, scale, *, min_y=0, max_y=8):
    obj = add_box(collection, name, location, scale, bpy.data.materials.get("Collision_Debug"))
    obj.display_type = "WIRE"
    obj.hide_render = True
    obj["collision_type"] = "box"
    obj["surface"] = False
    obj["minY"] = float(min_y)
    obj["maxY"] = float(max_y)
    return obj


def remove_named(names):
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
            print(f"Removed {name}")


def split_rear_wall(label, collision_label, side):
    collection = bpy.data.collections.get(f"ZONE_{'north-wing' if side < 0 else 'south-wing'}")
    if not collection:
        raise RuntimeError(f"Missing collection for {label}")

    x = side * 21
    door_x = side * 21
    z = -27.75
    length = 14
    door_width = 14.2
    material = find_material("Stone_Ash")

    remove_named([
        f"VIS_{label}_REAR_WALL",
        f"VIS_{label}_REAR_WALL_L",
        f"VIS_{label}_REAR_WALL_R",
        f"VIS_{label}_REAR_WALL_LINTEL",
        f"COL_BOX_{collision_label}_REAR_WALL",
        f"COL_BOX_{collision_label}_REAR_WALL_L",
        f"COL_BOX_{collision_label}_REAR_WALL_R",
        f"COL_BOX_{label}_REAR_WALL",
        f"COL_BOX_{label}_REAR_WALL_L",
        f"COL_BOX_{label}_REAR_WALL_R",
    ])

    left_len = max(0, door_x - door_width / 2 - (x - length / 2))
    right_len = max(0, (x + length / 2) - (door_x + door_width / 2))

    if left_len > 0.05:
        left_x = x - length / 2 + left_len / 2
        add_box(collection, f"VIS_{label}_REAR_WALL_L", (left_x, 4, z), (left_len, 8, 0.5), material)
        add_collision_box(collection, f"COL_BOX_{collision_label}_REAR_WALL_L", (left_x, 4, z), (left_len, 8, 0.5))
    if right_len > 0.05:
        right_x = door_x + door_width / 2 + right_len / 2
        add_box(collection, f"VIS_{label}_REAR_WALL_R", (right_x, 4, z), (right_len, 8, 0.5), material)
        add_collision_box(collection, f"COL_BOX_{collision_label}_REAR_WALL_R", (right_x, 4, z), (right_len, 8, 0.5))

    add_box(collection, f"VIS_{label}_REAR_WALL_LINTEL", (door_x, 7.65, z), (door_width + 0.5, 0.7, 0.54), material)
    print(f"Opened rear stair passage for {label}")


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER_BLEND))
    split_rear_wall("NORTH_WING", "NORTH", -1)
    split_rear_wall("SOUTH_WING", "SOUTH", 1)
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
    print(f"Saved {MASTER_BLEND}")


if __name__ == "__main__":
    main()
