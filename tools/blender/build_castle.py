import math
from pathlib import Path

import bpy


ROOT = Path.cwd()
OUT = ROOT / "public" / "castle"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def mat(name, color, roughness=0.85, metallic=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return material


def p3(x, y, z):
    return (x, -z, y)


def add_box(name, location, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[2] / 2, scale[1] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("stone_bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(material)
    return obj


def add_cylinder(name, location, radius, depth, material, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("edge_bevel", "BEVEL")
    bevel.width = min(radius * 0.08, 0.08)
    bevel.segments = 2
    return obj


def add_cone(name, location, radius1, radius2, depth, material, vertices=12):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=p3(*location),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def add_beam(name, start, end, width, material):
    start_b = p3(*start)
    end_b = p3(*end)
    mid = tuple((a + b) / 2 for a, b in zip(start_b, end_b))
    direction = tuple(b - a for a, b in zip(start_b, end_b))
    length = math.sqrt(sum(v * v for v in direction))
    bpy.ops.mesh.primitive_cube_add(location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width / 2, width / 2, length / 2)
    obj.rotation_mode = "QUATERNION"
    direction_vec = mathutils.Vector(direction)
    obj.rotation_quaternion = direction_vec.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("beam_bevel", "BEVEL")
    bevel.width = width * 0.16
    bevel.segments = 2
    return obj


def add_pointed_arch(name, center, width, spring_y, peak_y, depth, material):
    x, _, z = center
    pillar_w = max(0.45, width * 0.12)
    add_box(f"{name}_L", (x - width / 2, spring_y / 2, z), (pillar_w, spring_y, depth), material, 0.08)
    add_box(f"{name}_R", (x + width / 2, spring_y / 2, z), (pillar_w, spring_y, depth), material, 0.08)
    add_beam(f"{name}_ARCH_L", (x - width / 2, spring_y, z), (x, peak_y, z), pillar_w, material)
    add_beam(f"{name}_ARCH_R", (x + width / 2, spring_y, z), (x, peak_y, z), pillar_w, material)


def add_crenellations(prefix, x, z, length, along_x, y, material):
    count = max(3, int(length / 1.8))
    for index in range(count):
        t = index / max(1, count - 1)
        px = x + ((t - 0.5) * length if along_x else 0)
        pz = z + ((t - 0.5) * length if not along_x else 0)
        add_box(f"{prefix}_{index:02d}", (px, y, pz), (0.9, 1.15, 0.9), material, 0.04)


def add_gothic_window(prefix, x, y, z, facing_x, stone, glass):
    if facing_x:
        add_box(f"{prefix}_GLASS", (x, y, z), (0.08, 2.4, 1.0), glass)
        add_pointed_arch(prefix, (0, 0, 0), 1.5, 1.8, 2.8, 0.22, stone)
        parts = [obj for obj in bpy.context.scene.objects if obj.name.startswith(prefix) and "GLASS" not in obj.name]
        for obj in parts:
            obj.location.x += x
            obj.location.y += -z
            obj.location.z += y - 1.4
            obj.rotation_euler.z = math.pi / 2
    else:
        add_box(f"{prefix}_GLASS", (x, y, z), (1.0, 2.4, 0.08), glass)
        add_pointed_arch(prefix, (x, 0, z), 1.5, 1.8, 2.8, 0.22, stone)
        parts = [obj for obj in bpy.context.scene.objects if obj.name.startswith(prefix) and "GLASS" not in obj.name]
        for obj in parts:
            obj.location.z += y - 1.4


def add_torch_socket(name, location):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=p3(*location))
    bpy.context.object.name = name


def materials():
    return {
        "stone": mat("Stone_Ash", (0.19, 0.21, 0.23), 0.96),
        "stone_light": mat("Stone_Edge", (0.29, 0.31, 0.32), 0.92),
        "stone_dark": mat("Stone_Soot", (0.09, 0.105, 0.12), 1.0),
        "moss": mat("Stone_Moss", (0.12, 0.17, 0.11), 1.0),
        "wood": mat("Wood_Old", (0.16, 0.085, 0.045), 0.88),
        "metal": mat("Iron_Rusted", (0.12, 0.09, 0.075), 0.7, 0.65),
        "glass": mat("Glass_Cold", (0.08, 0.19, 0.25), 0.28, 0.1),
        "cloth": mat("Cloth_Burgundy", (0.18, 0.025, 0.035), 0.98),
    }


def build_exterior():
    m = materials()
    for z in (-8, 8):
        add_box(f"VIS_TOWER_{z}", (0, 8, z), (7, 16, 7), m["stone"], 0.18)
        add_cylinder(f"VIS_TOWER_CAP_{z}", (0, 16.5, z), 4.3, 1.1, m["stone_light"], 12)
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            add_box(
                f"VIS_TOWER_MERLON_{z}_{angle}",
                (math.cos(rad) * 3.65, 17.4, z + math.sin(rad) * 3.65),
                (1.0, 1.4, 1.0),
                m["stone_light"],
                0.05,
            )
        add_cone(f"VIS_TOWER_SPIRE_{z}", (0, 20.0, z), 3.8, 0.18, 5.2, m["stone_dark"], 12)

    add_box("VIS_GATE_BRIDGE", (0, 12.0, 0), (4.5, 8.0, 9.5), m["stone"], 0.15)
    add_pointed_arch("VIS_GATE_ARCH", (-2.4, 0, 0), 5.2, 5.8, 9.2, 1.0, m["stone_light"])
    add_crenellations("VIS_GATE_CRENEL", 0, 0, 9, False, 16.4, m["stone_light"])
    for z in (-5.2, 5.2):
        add_beam(f"VIS_BUTTRESS_{z}", (-3.4, 0.4, z), (-3.4, 11.5, z), 0.9, m["stone_light"])
    add_gothic_window("VIS_WINDOW_NORTH", -3.55, 12.0, -5.2, True, m["stone_light"], m["glass"])
    add_gothic_window("VIS_WINDOW_SOUTH", -3.55, 12.0, 5.2, True, m["stone_light"], m["glass"])
    add_torch_socket("SOCKET_FOG_GATE", (-3.65, 3.1, 0))


def build_gatehouse():
    m = materials()
    add_box("VIS_GATE_FLOOR", (0, -0.15, 8), (14, 0.3, 16), m["stone_dark"], 0.08)
    for x in (-6.75, 6.75):
        add_box(f"VIS_GATE_WALL_{x}", (x, 4, 8), (0.5, 8, 16), m["stone"], 0.12)
        for z in (3, 8, 13):
            add_beam(f"VIS_GATE_RIB_{x}_{z}", (x, 0.3, z), (x, 7.2, z), 0.45, m["stone_light"])
    for z in (0.25, 15.75):
        add_pointed_arch(f"VIS_GATE_PORTAL_{z}", (0, 0, z), 4.8, 4.7, 7.4, 0.65, m["stone_light"])
    for x in (-5.2, 5.2):
        add_cylinder(f"VIS_GATE_COLUMN_{x}", (x, 3.2, 8), 0.65, 6.4, m["stone_light"], 10)
        add_cone(f"VIS_GATE_COLUMN_CAP_{x}", (x, 6.65, 8), 0.95, 0.65, 0.65, m["stone_light"], 10)
    for z in (4, 8, 12):
        add_beam(f"VIS_GATE_CEILING_RIB_L_{z}", (-6.2, 5.2, z), (0, 7.7, z), 0.34, m["stone_light"])
        add_beam(f"VIS_GATE_CEILING_RIB_R_{z}", (6.2, 5.2, z), (0, 7.7, z), 0.34, m["stone_light"])
    add_torch_socket("SOCKET_TORCH_01", (-2.6, 2.2, 12))
    add_torch_socket("SOCKET_TORCH_02", (2.6, 2.2, 12))


def build_great_hall():
    m = materials()
    add_box("VIS_HALL_FLOOR", (0, -0.18, -34), (20, 0.35, 20), m["stone_dark"], 0.08)
    for x in (-9.75, 9.75):
        add_box(f"VIS_HALL_SIDE_WALL_{x}", (x, 5, -34), (0.5, 10, 20), m["stone"], 0.12)
    add_box("VIS_HALL_END_WALL", (0, 5, -43.75), (20, 10, 0.5), m["stone"], 0.12)
    for x in (-6.2, -3.1, 3.1, 6.2):
        for z in (-28, -34, -40):
            add_cylinder(f"VIS_HALL_COLUMN_{x}_{z}", (x, 3.6, z), 0.55, 7.2, m["stone_light"], 10)
            add_cone(f"VIS_HALL_CAP_{x}_{z}", (x, 7.45, z), 0.9, 0.58, 0.7, m["stone_light"], 10)
    for z in (-28, -34, -40):
        add_beam(f"VIS_HALL_RIB_L_{z}", (-9.2, 7.1, z), (0, 11.2, z), 0.38, m["stone_light"])
        add_beam(f"VIS_HALL_RIB_R_{z}", (9.2, 7.1, z), (0, 11.2, z), 0.38, m["stone_light"])
    for x in (-7.5, 7.5):
        for z in (-29, -35, -41):
            add_gothic_window(f"VIS_HALL_WINDOW_{x}_{z}", x, 5.3, z, True, m["stone_light"], m["glass"])
    add_box("VIS_THRONE_DAIS", (0, 0.45, -41), (6.8, 0.9, 3.2), m["stone_light"], 0.12)
    add_box("VIS_THRONE_SEAT", (0, 1.45, -41.3), (2.3, 2.0, 1.4), m["wood"], 0.18)
    add_box("VIS_THRONE_BACK", (0, 4.0, -41.8), (2.6, 5.0, 0.45), m["wood"], 0.16)
    add_pointed_arch("VIS_THRONE_ARCH", (0, 0, -43.45), 5.5, 5.0, 8.6, 0.48, m["stone_light"])
    for x in (-2.0, 2.0):
        add_box(f"VIS_BANNER_{x}", (x, 5.2, -43.35), (1.2, 5.5, 0.08), m["cloth"])
    add_torch_socket("SOCKET_TORCH_01", (-7.5, 2.2, -27))
    add_torch_socket("SOCKET_TORCH_02", (7.5, 2.2, -27))


def validate_scene(label, triangle_budget):
    triangles = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    if triangles > triangle_budget:
        raise RuntimeError(f"{label}: triangle budget exceeded ({triangles} > {triangle_budget})")
    print(f"{label}: {triangles} base triangles before modifiers")


def export_glb(path, label, triangle_budget):
    validate_scene(label, triangle_budget)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"Exported {path}")


def build_and_export(builder, path, label, budget):
    reset_scene()
    builder()
    export_glb(path, label, budget)


if __name__ == "__main__":
    import mathutils

    build_and_export(build_exterior, OUT / "exterior" / "gatehouse.glb", "gatehouse exterior", 150_000)
    build_and_export(build_gatehouse, OUT / "zones" / "gatehouse.glb", "gatehouse interior", 120_000)
    build_and_export(build_great_hall, OUT / "zones" / "great-hall.glb", "great hall", 250_000)
