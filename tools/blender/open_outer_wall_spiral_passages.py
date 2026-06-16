from pathlib import Path

import bpy


ROOT = Path.cwd()
MASTER_BLEND = ROOT / "assets" / "blender" / "castle_master.blend"


def p3(x, y, z):
    return (x, -z, y)


def material(name_prefix):
    for mat in bpy.data.materials:
        if mat.name.startswith(name_prefix):
            return mat
    return None


def add_box(collection, name, location, scale, mat=None):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[2] / 2, scale[1] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def add_collision_box(collection, name, location, scale, *, min_y, max_y):
    obj = add_box(collection, name, location, scale, material("Collision_Debug"))
    obj.display_type = "WIRE"
    obj.hide_render = True
    obj["collision_type"] = "box"
    obj["surface"] = False
    obj["minY"] = float(min_y)
    obj["maxY"] = float(max_y)
    return obj


def remove_prefixes(prefixes):
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            name = obj.name
            bpy.data.objects.remove(obj, do_unlink=True)
            print(f"Removed {name}")


def split_wall_z(collection, visual_prefix, collision_prefix, x, y, z, length, height, thickness, door_z, door_width, *, min_y, max_y):
    stone = material("Stone_Ash")
    front_len = max(0, door_z - door_width / 2 - (z - length / 2))
    rear_len = max(0, (z + length / 2) - (door_z + door_width / 2))

    if front_len > 0.05:
        front_z = z - length / 2 + front_len / 2
        add_box(collection, f"{visual_prefix}_A", (x, y + height / 2, front_z), (thickness, height, front_len), stone)
        add_collision_box(collection, f"{collision_prefix}_A", (x, y + height / 2, front_z), (thickness, height, front_len), min_y=min_y, max_y=max_y)
    if rear_len > 0.05:
        rear_z = door_z + door_width / 2 + rear_len / 2
        add_box(collection, f"{visual_prefix}_B", (x, y + height / 2, rear_z), (thickness, height, rear_len), stone)
        add_collision_box(collection, f"{collision_prefix}_B", (x, y + height / 2, rear_z), (thickness, height, rear_len), min_y=min_y, max_y=max_y)

    add_box(collection, f"{visual_prefix}_LINTEL", (x, y + height - 0.35, door_z), (thickness + 0.04, 0.7, door_width + 0.5), stone)
    print(f"Opened spiral passage for {collision_prefix}")


def main():
    bpy.ops.wm.open_mainfile(filepath=str(MASTER_BLEND))

    north = bpy.data.collections.get("ZONE_north-wing")
    south = bpy.data.collections.get("ZONE_south-wing")
    upper = bpy.data.collections.get("ZONE_upper-floor")
    if not north or not south or not upper:
        raise RuntimeError("Missing expected castle zone collections")

    remove_prefixes([
        "VIS_NORTH_WING_OUTER_WALL",
        "VIS_SOUTH_WING_OUTER_WALL",
        "VIS_UPPER_OUTER_WALL_-27.75",
        "VIS_UPPER_OUTER_WALL_27.75",
        "COL_BOX_NORTH_OUTER_WALL",
        "COL_BOX_SOUTH_OUTER_WALL",
        "COL_BOX_UPPER_OUTER_-27.75",
        "COL_BOX_UPPER_OUTER_27.75",
    ])

    split_wall_z(north, "VIS_NORTH_WING_OUTER_WALL", "COL_BOX_NORTH_OUTER_WALL", -27.75, 0, -10, 36, 8, 0.5, -26, 6.8, min_y=0, max_y=8)
    split_wall_z(south, "VIS_SOUTH_WING_OUTER_WALL", "COL_BOX_SOUTH_OUTER_WALL", 27.75, 0, -10, 36, 8, 0.5, -26, 6.8, min_y=0, max_y=8)
    split_wall_z(upper, "VIS_UPPER_OUTER_WALL_-27.75", "COL_BOX_UPPER_OUTER_-27.75", -27.75, 5, -12, 40, 4, 0.5, -26, 7.0, min_y=5, max_y=9)
    split_wall_z(upper, "VIS_UPPER_OUTER_WALL_27.75", "COL_BOX_UPPER_OUTER_27.75", 27.75, 5, -12, 40, 4, 0.5, -26, 7.0, min_y=5, max_y=9)

    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
    print(f"Saved {MASTER_BLEND}")


if __name__ == "__main__":
    main()
