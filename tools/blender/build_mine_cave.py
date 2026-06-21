from pathlib import Path

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


def add_cylinder(name, location, radius, depth, material, vertices=16, rot_x=0.0, rot_y=0.0, rot_z=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (rot_x, rot_z, -rot_y)
    obj.data.materials.append(material)
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
    bottom_y = -6.4
    stair_count = 16
    stair_depth = 18.0 / stair_count
    stair_height = abs(bottom_y) / stair_count
    passage_size = 6.4

    rock = mat("Mine_Rock_Dark", (0.09, 0.08, 0.075), 0.98)
    rock_light = mat("Mine_Rock_Edge", (0.20, 0.18, 0.15), 0.96)
    floor = mat("Mine_Dust_Floor", (0.17, 0.145, 0.12), 0.98)
    ore = mat("Mine_Copper_Ore", (0.72, 0.42, 0.17), 0.62, metallic=0.12)
    metal = mat("Mine_Dark_Metal", (0.08, 0.075, 0.07), 0.72, metallic=0.55)
    lamp = mat("Mine_Lamp_Glow", (1.0, 0.62, 0.24), 0.4, emission=(1.0, 0.45, 0.12), emission_strength=1.4)

    add_box("VIS_MINE_ENTRY_LIP_LEFT", (-4.1, -0.12, 0.2), (1.4, 0.24, 5.2), floor, 0.08)
    add_box("VIS_MINE_ENTRY_LIP_RIGHT", (4.1, -0.12, 0.2), (1.4, 0.24, 5.2), floor, 0.08)
    for i in range(stair_count):
        top_y = -stair_height * (i + 1)
        z = -0.6 - stair_depth * (i + 0.5)
        add_box(f"VIS_MINE_STAIR_{i + 1:02d}", (0, top_y - 0.08, z), (passage_size, 0.16, stair_depth + 0.03), floor, 0.025)
    add_box("VIS_MINE_CAVERN_FLOOR", (0, bottom_y - 0.15, -27), (13.0, 0.3, 18.0), floor, 0.08)

    for i, x in enumerate((-3.55, 3.55)):
        add_box(f"VIS_MINE_STAIR_WALL_{i}", (x, bottom_y * 0.5, -9.8), (0.36, passage_size, 18.6), rock, 0.035)
        add_box(f"VIS_MINE_CAVERN_WALL_{i}", (x, bottom_y * 0.5, -27), (0.36, passage_size, 18.0), rock, 0.04)

    add_box("VIS_MINE_BACK_WALL", (0, bottom_y * 0.5, -36.4), (7.4, passage_size, 0.36), rock, 0.04)
    add_box("VIS_MINE_LOW_CEILING", (0, -0.16, -21.0), (7.4, 0.24, 32.0), rock, 0.035)

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

    for i, (x, y, z) in enumerate(((-2.9, -4.8, -10.8), (2.9, -4.6, -20.5), (-3.4, -4.5, -30.5))):
        add_cylinder(f"VIS_MINE_LAMP_{i}", (x, y + 1.8, z), 0.16, 0.22, lamp, vertices=12)


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
