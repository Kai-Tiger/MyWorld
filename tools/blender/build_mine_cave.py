from pathlib import Path
from math import cos, pi, sin

import bpy


ROOT = Path.cwd()
OUT = ROOT / "public" / "models" / "mine_cave" / "mine_cave.glb"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def p3(x, y, z):
    return (x, -z, y)


def mat(name, color, roughness=0.85, metallic=0.0, emission=None, emission_strength=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_backface_culling = False
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    if emission:
        principled.inputs["Emission Color"].default_value = (*emission, 1.0)
        principled.inputs["Emission Strength"].default_value = emission_strength
    return material


def add_box(name, location, scale, material, bevel=0.0, rot_y=0.0):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[2] / 2, scale[1] / 2)
    obj.rotation_euler.z = -rot_y
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(material)
    return obj


def add_quad(name, points, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([p3(*point) for point in points], [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def add_cylinder(name, location, radius, depth, material, vertices=16, rot_x=0.0, rot_y=0.0, rot_z=0.0, end_fill_type="TRIFAN"):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        end_fill_type=end_fill_type,
        location=p3(*location),
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (rot_x, rot_z, -rot_y)
    obj.data.materials.append(material)
    return obj


def angle_delta(a, b):
    return (a - b + pi) % (pi * 2) - pi


def add_shaft_wall_with_bottom_opening(name, bottom_y, top_y, radius, material, vertices=32, opening_height=3.25, opening_half_angle=1.08):
    mid_y = min(top_y, bottom_y + opening_height)
    levels = (bottom_y, mid_y, top_y)
    verts = []
    for y in levels:
        for i in range(vertices):
            angle = i / vertices * pi * 2
            verts.append(p3(cos(angle) * radius, y, sin(angle) * radius))

    faces = []
    opening_center = -pi * 0.5
    for i in range(vertices):
        j = (i + 1) % vertices
        mid_angle = (i + 0.5) / vertices * pi * 2
        inside_bottom_opening = abs(angle_delta(mid_angle, opening_center)) <= opening_half_angle
        if not inside_bottom_opening:
            faces.append((i, j, vertices + j, vertices + i))
        faces.append((vertices + i, vertices + j, vertices * 2 + j, vertices * 2 + i))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    return obj


def add_shaft_ground_lip(name, inner_radius, outer_radius, material, vertices=44):
    verts = []
    for i in range(vertices):
        angle = i / vertices * pi * 2
        inner = inner_radius + sin(i * 1.73) * 0.06 + cos(i * 0.91) * 0.035
        outer = outer_radius + sin(i * 1.19 + 0.4) * 0.22 + cos(i * 0.67) * 0.12
        inner_y = -0.16 + sin(i * 0.87) * 0.035
        outer_y = -0.06 + cos(i * 1.11) * 0.075
        verts.append(p3(cos(angle) * inner, inner_y, sin(angle) * inner))
        verts.append(p3(cos(angle) * outer, outer_y, sin(angle) * outer))

    faces = []
    for i in range(vertices):
        j = (i + 1) % vertices
        faces.append((i * 2, j * 2, j * 2 + 1, i * 2 + 1))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    return obj


def add_rock(name, location, scale, material, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = (seed * 0.37, seed * 0.19, seed * 0.53)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("rock_facets", "DISPLACE")
    texture = bpy.data.textures.new(f"{name}_noise", "VORONOI")
    texture.noise_scale = 1.8
    texture.intensity = 0.26
    bevel.texture = texture
    bevel.strength = 0.12
    obj.modifiers.new("rock_normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(material)
    return obj


def build_mine_cave():
    bottom_y = -12.0
    passage_size = 6.4
    passage_height = 4.5
    passage_mid_y = bottom_y + passage_height * 0.5
    passage_top_y = bottom_y + passage_height
    ceiling_thickness = 0.24
    ladder_z = 1.78
    ladder_top_y = 0.45
    tunnel_half_width = 2.25
    tunnel_wall_thickness = 0.36
    tunnel_wall_x = tunnel_half_width + tunnel_wall_thickness * 0.5
    connector_z = -1.55
    connector_depth = 3.4
    tunnel_front_z = connector_z + connector_depth * 0.5
    tunnel_back_z = -18.65
    tunnel_z = (tunnel_front_z + tunnel_back_z) * 0.5
    tunnel_depth = tunnel_front_z - tunnel_back_z
    cavern_half_width = 6.5
    cavern_wall_x = cavern_half_width + tunnel_wall_thickness * 0.5
    cavern_front_z = -18.0
    cavern_front_wing_width = cavern_half_width - tunnel_half_width
    cavern_front_wing_x = tunnel_half_width + cavern_front_wing_width * 0.5

    rock = mat("Mine_Rock_Dark", (0.09, 0.08, 0.075), 0.98)
    rock_light = mat("Mine_Rock_Edge", (0.20, 0.18, 0.15), 0.96)
    floor = mat("Mine_Dust_Floor", (0.17, 0.145, 0.12), 0.98)
    rim_earth = mat("Mine_Rim_Earth", (0.095, 0.105, 0.065), 0.98)
    dark = mat("Mine_Shaft_Dark", (0.018, 0.016, 0.014), 1.0)
    ore = mat("Mine_Copper_Ore", (0.72, 0.42, 0.17), 0.62, metallic=0.12)
    metal = mat("Mine_Dark_Metal", (0.08, 0.075, 0.07), 0.72, metallic=0.55)
    lamp = mat("Mine_Lamp_Glow", (1.0, 0.62, 0.24), 0.4, emission=(1.0, 0.45, 0.12), emission_strength=1.4)

    add_shaft_wall_with_bottom_opening(
        "VIS_MINE_SHAFT_DARK",
        bottom_y,
        0,
        2.05,
        dark,
        vertices=32,
        opening_height=passage_height,
    )
    add_shaft_ground_lip("VIS_MINE_SHAFT_GROUND_LIP", 2.03, 3.35, rim_earth)

    for i in range(14):
        angle = i / 14 * pi * 2 + sin(i * 1.37) * 0.13
        radius = 2.42 + sin(i * 0.91) * 0.38
        x = cos(angle) * radius
        z = sin(angle) * radius
        sx = 0.58 + (sin(i * 2.11) + 1) * 0.28
        sy = 0.26 + (cos(i * 1.57) + 1) * 0.11
        sz = 0.42 + (sin(i * 1.83 + 0.5) + 1) * 0.22
        add_rock(f"VIS_MINE_SHAFT_EDGE_ROCK_{i:02d}", (x, -0.22, z), (sx, sz, sy), rock_light, 20 + i)

    for x in (-0.42, 0.42):
        add_box(
            f"VIS_MINE_SHAFT_LADDER_RAIL_{x}",
            (x, (bottom_y + ladder_top_y) * 0.5, ladder_z),
            (0.08, ladder_top_y - bottom_y, 0.08),
            metal,
            0.01,
        )
    rung_count = 22
    for i in range(rung_count):
        y = ladder_top_y - 0.10 - i * 0.56
        add_box(f"VIS_MINE_SHAFT_LADDER_RUNG_{i:02d}", (0, y, ladder_z), (1.05, 0.06, 0.08), metal, 0.008)

    add_box("VIS_MINE_BOTTOM_LADDER_PAD", (0, bottom_y - 0.12, 0.8), (2.6, 0.24, 2.4), floor, 0.05)
    add_box("VIS_MINE_BOTTOM_TUNNEL_FLOOR", (0, bottom_y - 0.14, tunnel_z), (4.5, 0.28, tunnel_depth), floor, 0.05)
    for x in (-0.42, 0.42):
        add_box(f"VIS_MINE_BOTTOM_LADDER_RAIL_{x}", (x, bottom_y + 1.25, ladder_z), (0.08, 2.5, 0.08), metal, 0.01)
    for i in range(4):
        add_box(f"VIS_MINE_BOTTOM_LADDER_RUNG_{i:02d}", (0, bottom_y + 0.35 + i * 0.46, ladder_z), (1.05, 0.06, 0.08), metal, 0.008)

    add_box("VIS_MINE_SHAFT_PORTAL_LEFT", (-1.95, passage_mid_y, connector_z), (0.32, passage_height, connector_depth), rock, 0.035)
    add_box("VIS_MINE_SHAFT_PORTAL_RIGHT", (1.95, passage_mid_y, connector_z), (0.32, passage_height, connector_depth), rock, 0.035)
    add_box("VIS_MINE_SHAFT_PORTAL_TOP", (0, passage_top_y + 0.17, connector_z), (4.05, 0.34, connector_depth), rock, 0.035)

    for i, x in enumerate((-tunnel_wall_x, tunnel_wall_x)):
        add_box(f"VIS_MINE_BOTTOM_TUNNEL_WALL_{i}", (x, passage_mid_y, tunnel_z), (tunnel_wall_thickness, passage_height, tunnel_depth), rock, 0.035)

    add_box("VIS_MINE_BOTTOM_TUNNEL_CEILING", (0, passage_top_y + ceiling_thickness * 0.5, -10.95), (4.86, ceiling_thickness, 15.4), rock, 0.035)
    add_box("VIS_MINE_CAVERN_FLOOR", (0, bottom_y - 0.15, -27), (13.0, 0.3, 18.0), floor, 0.08)
    add_box("VIS_MINE_CAVERN_FRONT_LEFT_WALL", (-cavern_front_wing_x, passage_mid_y, cavern_front_z), (cavern_front_wing_width, passage_height, tunnel_wall_thickness), rock, 0.04)
    add_box("VIS_MINE_CAVERN_FRONT_RIGHT_WALL", (cavern_front_wing_x, passage_mid_y, cavern_front_z), (cavern_front_wing_width, passage_height, tunnel_wall_thickness), rock, 0.04)
    add_box("VIS_MINE_CAVERN_FRONT_CEILING", (0, passage_top_y + ceiling_thickness * 0.5, cavern_front_z - 0.2), (13.4, ceiling_thickness, 1.2), rock, 0.035)
    for i, x in enumerate((-cavern_wall_x, cavern_wall_x)):
        add_box(f"VIS_MINE_CAVERN_WALL_{i}", (x, passage_mid_y, -27), (tunnel_wall_thickness, passage_height, 18.0), rock, 0.04)

    add_box("VIS_MINE_BACK_WALL", (0, passage_mid_y, -36.4), (13.4, passage_height, tunnel_wall_thickness), rock, 0.04)
    add_box("VIS_MINE_LOW_CEILING", (0, passage_top_y + ceiling_thickness * 0.5, -27.0), (13.4, ceiling_thickness, 18.8), rock, 0.035)

    for i, (x, y, z, sx, sy, sz) in enumerate((
        (-4.9, -0.35, 1.8, 1.2, 0.45, 0.9),
        (4.4, -0.28, -1.5, 1.0, 0.42, 0.8),
        (-5.4, bottom_y + 0.45, -24.0, 1.2, 0.9, 1.4),
        (5.5, bottom_y + 0.50, -29.0, 1.3, 1.0, 1.1),
        (0.0, bottom_y + 0.55, -35.0, 1.7, 1.1, 0.9),
    )):
        add_rock(f"VIS_MINE_BOULDER_{i:02d}", (x, y, z), (sx, sz, sy), rock_light, i + 1)

    for i, (x, z) in enumerate(((-2.0, -24.0), (2.1, -25.0), (-2.4, -29.0), (2.7, -30.0))):
        add_box(f"VIS_MINE_RAIL_BASE_{i}", (x * 0.12, bottom_y + 0.21, z), (4.2, 0.12, 0.34), rock_light, 0.02)
    add_box("VIS_MINE_RAIL_L", (-0.9, bottom_y + 0.33, -27.8), (0.12, 0.08, 9.8), ore, 0.01)
    add_box("VIS_MINE_RAIL_R", (0.9, bottom_y + 0.33, -27.8), (0.12, 0.08, 9.8), ore, 0.01)
    add_box("VIS_MINE_CART_BODY", (0.2, bottom_y + 0.95, -31.0), (2.0, 1.0, 1.5), metal, 0.04)
    add_box("VIS_MINE_CART_ORE", (0.2, bottom_y + 1.65, -31.0), (1.6, 0.45, 1.1), ore, 0.04)

    for i, (x, z) in enumerate(((-2.0, -10.8), (2.0, -20.5), (-2.4, -30.5))):
        add_cylinder(f"VIS_MINE_LAMP_{i}", (x, bottom_y + 3.0, z), 0.16, 0.22, lamp, vertices=12)


def export_glb():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"Exported {OUT}")


if __name__ == "__main__":
    reset_scene()
    build_mine_cave()
    export_glb()
