import json
from math import atan2, cos, hypot, sin
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path.cwd()
SOURCE_BLEND = ROOT / "assets" / "blender" / "mine_cave.blend"

BOTTOM_Y = -12.0
TOP_Y = -7.5
MID_Y = (BOTTOM_Y + TOP_Y) * 0.5
ROUTE_WIDTH = 5.2
S_PATH_WALL_THICKNESS = 0.24
S_PATH_WALL_OUTSET = 0.25
S_PATH_WALL_END_CLEARANCE = 2.4
S_PATH_WALL_MIN_LENGTH = 1.35
S_PATH_OPENING_COLLISION_CLEARANCE = 0.35
S_PATH_CLEARANCE_HALF_WIDTH = 2.65
S_PATH_SAMPLES_PER_SEGMENT = 8
MAIN_HALL_HALF_WIDTH = 6.5
MAIN_HALL_BACK_Z = -36.4


def p3(x, y, z):
    return (x, -z, y)


def material(name, color, roughness=0.9, metallic=0.0, alpha=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, alpha)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = "BLEND"
    return mat


ROCK = material("Mine_Rock_Dark", (0.09, 0.08, 0.075), 0.98)
FLOOR = material("Mine_Dust_Floor", (0.17, 0.145, 0.12), 0.98)
COL = material("Mine_Collision_Debug", (0.2, 0.8, 1.0), 0.5, alpha=0.22)


def clear_previous_s_path():
    prefixes = (
        "COL_",
        "VIS_MINE_S_PATH_",
        "VIS_MINE_SECOND_HALL_",
        "VIS_MINE_MAIN_HALL_BACK_OPENING",
        "VIS_MINE_MAIN_HALL_SIDE_",
        "VIS_MINE_ROUTE_",
        "VIS_MINE_BRANCH_",
        "VIS_MINE_DEEP_",
        "VIS_MINE_POCKET_",
        "VIS_MINE_CHAMBER_",
    )
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def make_mesh(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([p3(*v) for v in verts], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    return obj


def tangent(points, index):
    if index <= 0:
        a, b = points[0], points[1]
    elif index >= len(points) - 1:
        a, b = points[-2], points[-1]
    else:
        a, b = points[index - 1], points[index + 1]
    dx = b[0] - a[0]
    dz = b[1] - a[1]
    length = hypot(dx, dz) or 1
    return dx / length, dz / length


def extrapolate_endpoint(point, neighbor):
    return (point[0] * 2 - neighbor[0], point[1] * 2 - neighbor[1])


def catmull_rom_time(t, a, b):
    return t + hypot(b[0] - a[0], b[1] - a[1]) ** 0.5


def interpolate_point(a, b, ta, tb, t):
    if abs(tb - ta) < 0.000001:
        return a
    wa = (tb - t) / (tb - ta)
    wb = (t - ta) / (tb - ta)
    return (a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb)


def catmull_rom_point(p0, p1, p2, p3, amount):
    t0 = 0.0
    t1 = catmull_rom_time(t0, p0, p1)
    t2 = catmull_rom_time(t1, p1, p2)
    t3 = catmull_rom_time(t2, p2, p3)
    t = t1 + (t2 - t1) * amount

    a1 = interpolate_point(p0, p1, t0, t1, t)
    a2 = interpolate_point(p1, p2, t1, t2, t)
    a3 = interpolate_point(p2, p3, t2, t3, t)
    b1 = interpolate_point(a1, a2, t0, t2, t)
    b2 = interpolate_point(a2, a3, t1, t3, t)
    return interpolate_point(b1, b2, t1, t2, t)


def sample_smooth_path(control_points, samples_per_segment=S_PATH_SAMPLES_PER_SEGMENT):
    points = []
    last = len(control_points) - 1
    for i in range(last):
        p0 = control_points[i - 1] if i > 0 else extrapolate_endpoint(control_points[i], control_points[i + 1])
        p1 = control_points[i]
        p2 = control_points[i + 1]
        p3 = control_points[i + 2] if i + 2 <= last else extrapolate_endpoint(control_points[i + 1], control_points[i])
        for step in range(samples_per_segment):
            points.append(catmull_rom_point(p0, p1, p2, p3, step / samples_per_segment))
    points.append(control_points[-1])
    return points


def build_s_path_shell(points):
    verts = []
    for i, (x, z) in enumerate(points):
        tx, tz = tangent(points, i)
        nx, nz = -tz, tx
        half = ROUTE_WIDTH * 0.5
        left = (x + nx * half, z + nz * half)
        right = (x - nx * half, z - nz * half)
        verts.extend((
            (left[0], BOTTOM_Y, left[1]),
            (right[0], BOTTOM_Y, right[1]),
            (right[0], TOP_Y, right[1]),
            (left[0], TOP_Y, left[1]),
        ))

    faces = []
    for i in range(len(points) - 1):
        a = i * 4
        b = (i + 1) * 4
        faces.extend((
            (a, b, b + 1, a + 1),       # floor
            (a + 1, b + 1, b + 2, a + 2), # right wall
            (a + 2, b + 2, b + 3, a + 3), # ceiling
            (a + 3, b + 3, b, a),       # left wall
        ))
    make_mesh("VIS_MINE_S_PATH_TUNNEL", verts, faces, ROCK)


def build_second_hall(center, width=10.5, depth=12.0):
    cx, cz = center
    hw = width * 0.5
    front = cz + depth * 0.5
    back = cz - depth * 0.5
    verts = [
        (cx - hw, BOTTOM_Y, front),
        (cx + hw, BOTTOM_Y, front),
        (cx + hw, BOTTOM_Y, back),
        (cx - hw, BOTTOM_Y, back),
        (cx - hw, TOP_Y, front),
        (cx + hw, TOP_Y, front),
        (cx + hw, TOP_Y, back),
        (cx - hw, TOP_Y, back),
    ]
    faces = [
        (0, 1, 2, 3), # floor
        (4, 7, 6, 5), # ceiling
        (3, 2, 6, 7), # back
        (0, 3, 7, 4), # left
        (1, 5, 6, 2), # right
    ]
    make_mesh("VIS_MINE_SECOND_HALL_SHELL", verts, faces, ROCK)


def add_box(name, location, scale, mat, rot_y=0.0, collision=False):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] * 0.5, scale[2] * 0.5, scale[1] * 0.5)
    obj.rotation_euler.z = -rot_y
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if collision:
        obj.display_type = "WIRE"
        obj.hide_render = True
        obj.show_name = True
    return obj


def add_col_box(name, location, scale, rot_y=0.0):
    obj = add_box(name, location, scale, COL, rot_y=rot_y, collision=True)
    direction = Vector((0.0, 1.0))
    normal = Vector((-1.0, 0.0))
    if abs(rot_y) > 0.00001:
        direction = Vector((sin(rot_y), cos(rot_y)))
        normal = Vector((-direction.y, direction.x))

    obj["game_x"] = float(location[0])
    obj["game_z"] = float(location[2])
    obj["game_hx"] = float(scale[0] * 0.5)
    obj["game_hz"] = float(scale[2] * 0.5)
    obj["game_ux"] = float(normal.x)
    obj["game_uz"] = float(normal.y)
    obj["game_vx"] = float(direction.x)
    obj["game_vz"] = float(direction.y)
    if name.startswith("COL_SURFACE_"):
        obj["game_h"] = float(location[1] + scale[1] * 0.5)
    elif name.startswith("COL_WALL_"):
        obj["game_minY"] = float(location[1] - scale[1] * 0.5)
        obj["game_maxY"] = float(location[1] + scale[1] * 0.5)
    return obj


def add_main_hall_back_opening():
    wall_height = TOP_Y - BOTTOM_Y
    side_width = (MAIN_HALL_HALF_WIDTH - ROUTE_WIDTH * 0.5) * 0.5
    left_x = -(ROUTE_WIDTH * 0.5 + side_width * 0.5)
    right_x = ROUTE_WIDTH * 0.5 + side_width * 0.5
    collider_side_width = max(0.2, side_width - S_PATH_OPENING_COLLISION_CLEARANCE)
    collider_left_x = left_x - S_PATH_OPENING_COLLISION_CLEARANCE * 0.5
    collider_right_x = right_x + S_PATH_OPENING_COLLISION_CLEARANCE * 0.5
    for name, x, collider_x in (("LEFT", left_x, collider_left_x), ("RIGHT", right_x, collider_right_x)):
        add_box(f"VIS_MINE_MAIN_HALL_BACK_OPENING_{name}", (x, MID_Y, MAIN_HALL_BACK_Z), (side_width, wall_height, 0.36), ROCK)
        wall = add_col_box(f"COL_WALL_MAIN_HALL_BACK_{name}", (collider_x, MID_Y, MAIN_HALL_BACK_Z), (collider_side_width, wall_height, 0.36))
        wall["game_clearancePathId"] = "mine_cave_s_path"


def add_main_hall_side_walls():
    wall_height = TOP_Y - BOTTOM_Y
    for name, x in (("LEFT", -MAIN_HALL_HALF_WIDTH - 0.18), ("RIGHT", MAIN_HALL_HALF_WIDTH + 0.18)):
        add_box(f"VIS_MINE_MAIN_HALL_SIDE_{name}", (x, MID_Y, -27.0), (0.36, wall_height, 18.0), ROCK)
        add_col_box(f"COL_WALL_MAIN_HALL_SIDE_{name}", (x, MID_Y, -27.0), (0.36, wall_height, 18.0))


def add_core_colliders():
    add_col_box("COL_SURFACE_LADDER_PAD", (0, BOTTOM_Y - 0.12, 0.8), (2.6, 0.24, 2.4))
    add_col_box("COL_ZONE_LADDER_PAD", (0, BOTTOM_Y, 0.8), (3.2, 0.12, 2.8))
    add_col_box("COL_SURFACE_BOTTOM_TUNNEL", (0, BOTTOM_Y - 0.14, -9.25), (4.5, 0.28, 18.8))
    add_col_box("COL_ZONE_BOTTOM_TUNNEL", (0, BOTTOM_Y, -9.25), (5.0, 0.12, 19.2))
    for side, x in (("L", -2.43), ("R", 2.43)):
        add_col_box(f"COL_WALL_BOTTOM_TUNNEL_{side}", (x, MID_Y, -9.25), (0.36, TOP_Y - BOTTOM_Y, 18.8))
    add_col_box("COL_SURFACE_MAIN_CAVERN", (0, BOTTOM_Y - 0.15, -27.0), (13.0, 0.30, 18.0))
    add_col_box("COL_ZONE_MAIN_CAVERN", (0, BOTTOM_Y, -27.0), (13.6, 0.12, 18.6))


def add_s_path_colliders(points):
    for i in range(len(points) - 1):
        ax, az = points[i]
        bx, bz = points[i + 1]
        dx = bx - ax
        dz = bz - az
        length = hypot(dx, dz)
        cx = (ax + bx) * 0.5
        cz = (az + bz) * 0.5
        rot = atan2(dx, dz)
        add_col_box(f"COL_SURFACE_S_PATH_{i:02d}", (cx, BOTTOM_Y - 0.12, cz), (ROUTE_WIDTH + 0.55, 0.24, length + 1.2), rot)
        add_col_box(f"COL_ZONE_S_PATH_{i:02d}", (cx, BOTTOM_Y, cz), (ROUTE_WIDTH + 1.05, 0.12, length + 1.4), rot)
        nx = -dz / (length or 1)
        nz = dx / (length or 1)
        for side, sign in (("L", 1), ("R", -1)):
            wall = add_col_box(
                f"COL_WALL_S_PATH_{i:02d}_{side}",
                (
                    cx + nx * sign * (ROUTE_WIDTH * 0.5 + S_PATH_WALL_OUTSET + S_PATH_WALL_THICKNESS * 0.5),
                    MID_Y,
                    cz + nz * sign * (ROUTE_WIDTH * 0.5 + S_PATH_WALL_OUTSET + S_PATH_WALL_THICKNESS * 0.5),
                ),
                (S_PATH_WALL_THICKNESS, TOP_Y - BOTTOM_Y, max(S_PATH_WALL_MIN_LENGTH, length - S_PATH_WALL_END_CLEARANCE * 2)),
                rot,
            )
            wall["game_clearancePathId"] = "mine_cave_s_path"

    node_size = ROUTE_WIDTH + 1.8
    for i, (x, z) in enumerate(points):
        add_col_box(f"COL_SURFACE_S_PATH_NODE_{i:02d}", (x, BOTTOM_Y - 0.12, z), (node_size, 0.24, node_size))
        add_col_box(f"COL_ZONE_S_PATH_NODE_{i:02d}", (x, BOTTOM_Y, z), (node_size + 0.8, 0.12, node_size + 0.8))


def set_s_path_clearance_manifest(points):
    bpy.context.scene["mine_cave_paths_json"] = json.dumps([
        {
            "id": "mine_cave_s_path",
            "points": [{"x": x, "z": z} for x, z in points],
            "halfWidth": S_PATH_CLEARANCE_HALF_WIDTH,
            "minY": BOTTOM_Y - 0.5,
            "maxY": TOP_Y + 0.35,
        }
    ])


def add_second_hall_colliders(center, width=10.5, depth=12.0):
    cx, cz = center
    add_col_box("COL_SURFACE_SECOND_HALL", (cx, BOTTOM_Y - 0.12, cz), (width, 0.24, depth))
    add_col_box("COL_ZONE_SECOND_HALL", (cx, BOTTOM_Y, cz), (width + 0.6, 0.12, depth + 0.6))
    for name, loc, scale in (
        ("LEFT", (cx - width * 0.5 - 0.18, MID_Y, cz), (0.36, TOP_Y - BOTTOM_Y, depth)),
        ("RIGHT", (cx + width * 0.5 + 0.18, MID_Y, cz), (0.36, TOP_Y - BOTTOM_Y, depth)),
        ("BACK", (cx, MID_Y, cz - depth * 0.5 - 0.18), (width, TOP_Y - BOTTOM_Y, 0.36)),
    ):
        add_col_box(f"COL_WALL_SECOND_HALL_{name}", loc, scale)


def main():
    if Path(bpy.data.filepath).resolve() != SOURCE_BLEND.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))

    clear_previous_s_path()
    add_main_hall_side_walls()
    add_main_hall_back_opening()

    control_points = [
        (0.0, -36.0),
        (3.8, -43.5),
        (-3.2, -51.0),
        (4.2, -59.0),
        (-1.2, -67.5),
        (0.0, -72.0),
    ]
    points = sample_smooth_path(control_points)
    second_hall_center = (0.0, -78.0)
    set_s_path_clearance_manifest(points)
    build_s_path_shell(points)
    build_second_hall(second_hall_center)

    add_core_colliders()
    add_s_path_colliders(points)
    add_second_hall_colliders(second_hall_center)

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
    print(f"Saved {SOURCE_BLEND}")


if __name__ == "__main__":
    main()
