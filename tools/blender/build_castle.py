import json
import math
from pathlib import Path

import bpy


ROOT = Path.cwd()
OUT = ROOT / "public" / "castle"
TEXTURE_DIR = ROOT / "public" / "textures"
ASSET_DIR = ROOT / "assets" / "blender"
MASTER_BLEND = ASSET_DIR / "castle_master.blend"
MANIFEST = OUT / "castle-manifest.json"
ZONE_COLLECTION_PREFIX = "ZONE_"
CASTLE_BUILD_VERSION = 16
STONE_TILE_SIZE = 3.6
CASTLE_STONE_TEXTURES = {
    "color": TEXTURE_DIR / "castle_stone_wall_diff_1k.jpg",
    "normal": TEXTURE_DIR / "castle_stone_wall_nor_gl_1k.jpg",
    "roughness": TEXTURE_DIR / "castle_stone_wall_rough_1k.jpg",
}

ZONE_RUNTIME = {
    "gatehouse": {
        "name": "城门",
        "bounds": {"minX": -7, "maxX": 7, "minZ": 0, "maxZ": 16},
        "minY": -1,
        "maxY": 4.5,
        "neighbors": ["courtyard", "north-wing", "south-wing"],
        "connectors": [
            {"to": "courtyard", "x": 0, "y": 0, "z": 15.4, "range": 3.4},
            {"to": "north-wing", "x": -6.1, "y": 0, "z": 8, "range": 3.0},
            {"to": "south-wing", "x": 6.1, "y": 0, "z": 8, "range": 3.0},
        ],
    },
    "courtyard": {
        "name": "下层庭院与中庭前厅",
        "bounds": {"minX": -42, "maxX": 42, "minZ": -48, "maxZ": 16},
        "minY": -1,
        "maxY": 4.5,
        "neighbors": ["gatehouse", "north-wing", "south-wing", "great-hall", "atrium"],
        "connectors": [
            {"to": "gatehouse", "x": 0, "y": 0, "z": 0.3, "range": 3.4},
            {"to": "great-hall", "x": 0, "y": 0, "z": -23.7, "range": 3.4},
            {"to": "atrium", "x": 0, "y": 0, "z": -32, "range": 7.0},
            {"to": "north-wing", "x": -14, "y": 0, "z": -10, "range": 5.0},
            {"to": "south-wing", "x": 14, "y": 0, "z": -10, "range": 5.0},
        ],
    },
    "north-wing": {
        "name": "北翼兵器库",
        "bounds": {"minX": -50, "maxX": -14, "minZ": -78, "maxZ": 20},
        "minY": -1,
        "maxY": 5.5,
        "neighbors": ["gatehouse", "courtyard", "atrium", "great-hall", "upper-floor"],
        "connectors": [
            {"to": "gatehouse", "x": -14, "y": 0, "z": 8, "range": 4.0},
            {"to": "courtyard", "x": -14, "y": 0, "z": -10, "range": 5.0},
            {"to": "upper-floor", "x": -18, "y": 5, "z": -16.5, "range": 4.0},
            {"to": "atrium", "x": -34, "y": 0, "z": -29, "range": 5.0},
        ],
    },
    "south-wing": {
        "name": "南翼礼拜堂",
        "bounds": {"minX": 14, "maxX": 50, "minZ": -78, "maxZ": 20},
        "minY": -1,
        "maxY": 5.5,
        "neighbors": ["gatehouse", "courtyard", "atrium", "great-hall", "upper-floor"],
        "connectors": [
            {"to": "gatehouse", "x": 14, "y": 0, "z": 8, "range": 4.0},
            {"to": "courtyard", "x": 14, "y": 0, "z": -10, "range": 5.0},
            {"to": "upper-floor", "x": 18, "y": 5, "z": -16.5, "range": 4.0},
            {"to": "atrium", "x": 34, "y": 0, "z": -29, "range": 5.0},
        ],
    },
    "great-hall": {
        "name": "主厅",
        "bounds": {"minX": -42, "maxX": 42, "minZ": -80, "maxZ": -44},
        "minY": -1,
        "maxY": 5.5,
        "neighbors": ["courtyard", "atrium", "north-wing", "south-wing", "upper-floor"],
        "connectors": [
            {"to": "courtyard", "x": 0, "y": 0, "z": -24.3, "range": 3.4},
            {"to": "atrium", "x": 0, "y": 0, "z": -48, "range": 5.0},
            {"to": "upper-floor", "x": 0, "y": 5, "z": -43.5, "range": 4.0},
        ],
    },
    "upper-floor": {
        "name": "二楼大厅群",
        "bounds": {"minX": -50, "maxX": 50, "minZ": -80, "maxZ": 24},
        "minY": 4.5,
        "maxY": 9.5,
        "neighbors": ["atrium", "north-wing", "south-wing", "great-hall", "floor-3"],
        "connectors": [
            {"to": "atrium", "x": -27.8, "y": 5, "z": -29, "range": 4.0},
            {"to": "north-wing", "x": -18, "y": 5, "z": -16.5, "range": 4.0},
            {"to": "south-wing", "x": 18, "y": 5, "z": -16.5, "range": 4.0},
            {"to": "floor-3", "x": -27.8, "y": 10, "z": -29, "range": 4.0},
        ],
    },
    "atrium": {
        "name": "中央中庭",
        "bounds": {"minX": -50, "maxX": 50, "minZ": -80, "maxZ": 24},
        "minY": -1,
        "maxY": 20.5,
        "neighbors": ["courtyard", "north-wing", "south-wing", "great-hall", "upper-floor", "floor-3", "floor-4"],
        "connectors": [
            {"to": "courtyard", "x": 0, "y": 0, "z": -10, "range": 7.0},
            {"to": "upper-floor", "x": -27.8, "y": 5, "z": -29, "range": 4.0},
            {"to": "floor-3", "x": -27.8, "y": 10, "z": -29, "range": 4.0},
            {"to": "floor-4", "x": -27.8, "y": 15, "z": -29, "range": 4.0},
        ],
    },
    "floor-3": {
        "name": "三楼回廊",
        "bounds": {"minX": -50, "maxX": 50, "minZ": -80, "maxZ": 24},
        "minY": 9.5,
        "maxY": 14.5,
        "neighbors": ["atrium", "upper-floor", "floor-4"],
        "connectors": [
            {"to": "atrium", "x": -27.8, "y": 10, "z": -29, "range": 4.0},
            {"to": "upper-floor", "x": -27.8, "y": 5, "z": -29, "range": 4.0},
            {"to": "floor-4", "x": -27.8, "y": 15, "z": -29, "range": 4.0},
        ],
    },
    "floor-4": {
        "name": "四楼观景层",
        "bounds": {"minX": -50, "maxX": 50, "minZ": -80, "maxZ": 24},
        "minY": 14.5,
        "maxY": 20.5,
        "neighbors": ["atrium", "floor-3", "roof"],
        "connectors": [
            {"to": "atrium", "x": -27.8, "y": 15, "z": -29, "range": 4.0},
            {"to": "floor-3", "x": -27.8, "y": 10, "z": -29, "range": 4.0},
            {"to": "roof", "x": 42, "y": 20, "z": 19.2, "range": 4.0},
        ],
    },
    "roof": {
        "name": "屋顶垛口",
        "bounds": {"minX": -54, "maxX": 54, "minZ": -84, "maxZ": 26},
        "minY": 19.5,
        "maxY": 28,
        "neighbors": ["floor-4"],
        "connectors": [
            {"to": "floor-4", "x": 42, "y": 20, "z": 19.2, "range": 4.0},
        ],
    },
}


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


def load_material_image(path, *, color_space):
    if not path.exists():
        raise FileNotFoundError(f"Missing castle material texture: {path}")
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = color_space
    return image


def texture_node(material, path, *, color_space, label):
    node = material.node_tree.nodes.new("ShaderNodeTexImage")
    node.name = label
    node.label = label
    node.image = load_material_image(path, color_space=color_space)
    node.extension = "REPEAT"
    return node


def stone_texture_mat(name, color, roughness=0.95, normal_strength=0.55):
    material = mat(name, color, roughness)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")

    color_node = texture_node(material, CASTLE_STONE_TEXTURES["color"], color_space="sRGB", label=f"{name}_Color")
    roughness_node = texture_node(material, CASTLE_STONE_TEXTURES["roughness"], color_space="Non-Color", label=f"{name}_Roughness")
    normal_node = texture_node(material, CASTLE_STONE_TEXTURES["normal"], color_space="Non-Color", label=f"{name}_NormalGL")
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.name = f"{name}_NormalMap"
    normal_map.inputs["Strength"].default_value = normal_strength

    links.new(color_node.outputs["Color"], principled.inputs["Base Color"])
    links.new(roughness_node.outputs["Color"], principled.inputs["Roughness"])
    links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], principled.inputs["Normal"])
    return material


def collision_mat():
    material = bpy.data.materials.get("Collision_Debug") or bpy.data.materials.new("Collision_Debug")
    material.diffuse_color = (1.0, 0.18, 0.08, 0.22)
    material.use_nodes = True
    material.blend_method = "BLEND"
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (1.0, 0.18, 0.08, 0.22)
    principled.inputs["Alpha"].default_value = 0.22
    return material


def p3(x, y, z):
    return (x, -z, y)


def project_box_uvs(obj, tile_size=STONE_TILE_SIZE):
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        normal = poly.normal
        for loop_index in poly.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if abs(normal.z) > abs(normal.x) and abs(normal.z) > abs(normal.y):
                uv = (vertex.x / tile_size, vertex.y / tile_size)
            elif abs(normal.x) > abs(normal.y):
                uv = (vertex.y / tile_size, vertex.z / tile_size)
            else:
                uv = (vertex.x / tile_size, vertex.z / tile_size)
            uv_layer.data[loop_index].uv = uv


def add_box(name, location, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[2] / 2, scale[1] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material.name.startswith("Stone_"):
        project_box_uvs(obj)
    if bevel:
        modifier = obj.modifiers.new("stone_bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(material)
    return obj


def add_collision_box(name, location, scale, *, surface=False, min_y=None, max_y=None, h=None):
    obj = add_box(name, location, scale, collision_mat(), 0.0)
    obj.display_type = "WIRE"
    obj.hide_render = True
    obj["collision_type"] = "box"
    obj["surface"] = bool(surface)
    if min_y is not None:
        obj["minY"] = float(min_y)
    if max_y is not None:
        obj["maxY"] = float(max_y)
    if h is not None:
        obj["h"] = float(h)
    return obj


def add_collision_ramp(name, location, scale, *, axis="z", h0=0, h1=5, reverse=False):
    obj = add_collision_box(name, location, scale, surface=True)
    obj["collision_type"] = "ramp"
    obj["axis"] = axis
    obj["h0"] = float(h0)
    obj["h1"] = float(h1)
    obj["reverse"] = bool(reverse)
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


def add_vault_roof(prefix, x, z, width, length, eave_y, peak_y, material):
    rise = peak_y - eave_y
    slope_length = math.hypot(width / 2, rise)
    angle = math.atan2(rise, width / 2)
    for side, label in ((-1, "L"), (1, "R")):
        roof = add_box(
            f"{prefix}_{label}",
            (x + side * width / 4, eave_y + rise / 2, z),
            (slope_length, 0.5, length),
            material,
            0.12,
        )
        roof.rotation_euler.y = side * angle


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


def add_front_door(prefix, z, material, frame_material, metal, closed, x=-28.12):
    if closed:
        add_box(f"{prefix}_DOOR", (x - 0.03, 1.4, z), (0.18, 2.8, 1.55), material, 0.04)
        add_cylinder(f"{prefix}_HANDLE", (x - 0.14, 1.38, z - 0.48), 0.09, 0.16, metal, 10)
        handle = bpy.context.object
        handle.rotation_euler.y = math.pi / 2
    else:
        add_box(f"{prefix}_DARK_RECESS", (x + 0.03, 1.45, z), (0.12, 2.9, 1.65), frame_material, 0.02)
    for dz in (-0.92, 0.92):
        add_box(f"{prefix}_FRAME_{dz}", (x - 0.08, 1.55, z + dz), (0.28, 3.1, 0.28), frame_material, 0.04)
    add_box(f"{prefix}_LINTEL", (x - 0.08, 3.0, z), (0.28, 0.32, 2.12), frame_material, 0.04)


def add_wall_x_with_door(prefix, x, y, z, length, height, thickness, door_x, door_width, material):
    left_len = max(0, door_x - door_width / 2 - (x - length / 2))
    right_len = max(0, (x + length / 2) - (door_x + door_width / 2))
    if left_len > 0.05:
        add_box(f"{prefix}_L", (x - length / 2 + left_len / 2, y + height / 2, z), (left_len, height, thickness), material, 0.08)
    if right_len > 0.05:
        add_box(f"{prefix}_R", (door_x + door_width / 2 + right_len / 2, y + height / 2, z), (right_len, height, thickness), material, 0.08)
    add_box(f"{prefix}_LINTEL", (door_x, y + height - 0.35, z), (door_width + 0.5, 0.7, thickness + 0.04), material, 0.06)


def add_collision_wall_x_with_door(prefix, x, y, z, length, height, thickness, door_x, door_width, *, min_y=None, max_y=None):
    left_len = max(0, door_x - door_width / 2 - (x - length / 2))
    right_len = max(0, (x + length / 2) - (door_x + door_width / 2))
    if left_len > 0.05:
        add_collision_box(f"{prefix}_L", (x - length / 2 + left_len / 2, y + height / 2, z), (left_len, height, thickness), min_y=min_y, max_y=max_y)
    if right_len > 0.05:
        add_collision_box(f"{prefix}_R", (door_x + door_width / 2 + right_len / 2, y + height / 2, z), (right_len, height, thickness), min_y=min_y, max_y=max_y)


def add_wall_z_with_door(prefix, x, y, z, length, height, thickness, door_z, door_width, material):
    front_len = max(0, door_z - door_width / 2 - (z - length / 2))
    rear_len = max(0, (z + length / 2) - (door_z + door_width / 2))
    if front_len > 0.05:
        add_box(f"{prefix}_A", (x, y + height / 2, z - length / 2 + front_len / 2), (thickness, height, front_len), material, 0.08)
    if rear_len > 0.05:
        add_box(f"{prefix}_B", (x, y + height / 2, door_z + door_width / 2 + rear_len / 2), (thickness, height, rear_len), material, 0.08)
    add_box(f"{prefix}_LINTEL", (x, y + height - 0.35, door_z), (thickness + 0.04, 0.7, door_width + 0.5), material, 0.06)


def add_collision_wall_z_with_door(prefix, x, y, z, length, height, thickness, door_z, door_width, *, min_y=None, max_y=None):
    front_len = max(0, door_z - door_width / 2 - (z - length / 2))
    rear_len = max(0, (z + length / 2) - (door_z + door_width / 2))
    if front_len > 0.05:
        add_collision_box(f"{prefix}_A", (x, y + height / 2, z - length / 2 + front_len / 2), (thickness, height, front_len), min_y=min_y, max_y=max_y)
    if rear_len > 0.05:
        add_collision_box(f"{prefix}_B", (x, y + height / 2, door_z + door_width / 2 + rear_len / 2), (thickness, height, rear_len), min_y=min_y, max_y=max_y)


def materials():
    return {
        "stone": stone_texture_mat("Stone_Ash", (0.62, 0.61, 0.56), 0.96, 0.34),
        "stone_light": stone_texture_mat("Stone_Edge", (0.74, 0.72, 0.66), 0.94, 0.28),
        "stone_dark": stone_texture_mat("Stone_Soot", (0.36, 0.36, 0.33), 1.0, 0.2),
        "moss": stone_texture_mat("Stone_Moss", (0.38, 0.44, 0.32), 1.0, 0.28),
        "wood": mat("Wood_Old", (0.16, 0.085, 0.045), 0.88),
        "metal": mat("Iron_Rusted", (0.12, 0.09, 0.075), 0.7, 0.65),
        "glass": mat("Glass_Cold", (0.08, 0.19, 0.25), 0.28, 0.1),
        "cloth": mat("Cloth_Burgundy", (0.18, 0.025, 0.035), 0.98),
    }


def build_exterior():
    m = materials()
    add_box("VIS_CASTLE_MAIN_BODY", (0, 8.5, -28), (112, 17, 104), m["stone"], 0.2)
    add_box("VIS_CASTLE_UPPER_KEEP", (6, 20.0, -48), (52, 14.0, 36), m["stone_dark"], 0.18)
    add_box("VIS_CASTLE_CENTRAL_KEEP", (-4, 18.0, -28), (42, 20.0, 42), m["stone_light"], 0.18)
    add_box("VIS_CATHEDRAL_NAVE_TALL", (-10, 28.0, -31), (34, 18, 58), m["stone"], 0.16)
    add_box("VIS_CATHEDRAL_TRIFORIUM", (-16, 38.0, -31), (22, 8, 48), m["stone_dark"], 0.14)
    add_cone("VIS_CENTRAL_NEEDLE_SPIRE", (-16, 55.0, -31), 9.5, 0.25, 26, m["stone_dark"], 18)
    add_cone("VIS_REAR_BELL_SPIRE", (18, 45.0, -62), 6.4, 0.2, 18, m["stone_dark"], 16)
    add_cone("VIS_FRONT_BELL_SPIRE", (18, 43.0, 4), 5.6, 0.2, 16, m["stone_dark"], 16)
    add_crenellations("VIS_FRONT_CRENEL", -56.0, -28, 104, False, 17.4, m["stone_light"])
    add_crenellations("VIS_REAR_CRENEL", 56.0, -28, 104, False, 17.4, m["stone_light"])
    add_crenellations("VIS_NORTH_CRENEL", 0, -80.0, 112, True, 17.4, m["stone_light"])
    add_crenellations("VIS_SOUTH_CRENEL", 0, 24.0, 112, True, 17.4, m["stone_light"])
    for x, z in ((-46, -72), (-46, 18), (46, -72), (46, 18)):
        add_cylinder(f"VIS_SIDE_TOWER_{x}_{z}", (x, 12.0, z), 7.2, 24, m["stone"], 14)
        add_cylinder(f"VIS_SIDE_TOWER_CAP_{x}_{z}", (x, 24.2, z), 7.5, 0.9, m["stone_light"], 14)
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            add_box(
                f"VIS_SIDE_TOWER_MERLON_{x}_{z}_{angle}",
                (x + math.cos(rad) * 6.65, 25.1, z + math.sin(rad) * 6.65),
                (1.0, 1.4, 1.0),
                m["stone_light"],
                0.05,
            )
        add_cone(f"VIS_SIDE_TOWER_SPIRE_{x}_{z}", (x, 29.0, z), 6.6, 0.2, 7.2, m["stone_dark"], 14)

    for z in (-68, -52, -36, -20):
        add_box(f"VIS_WEST_FLYING_BUTTRESS_{z}", (-60.0, 13.0, z), (5.6, 16.0, 1.0), m["stone_light"], 0.08)
        add_box(f"VIS_EAST_FLYING_BUTTRESS_{z}", (60.0, 13.0, z), (5.6, 16.0, 1.0), m["stone_light"], 0.08)
        add_beam(f"VIS_WEST_BUTTRESS_ARCH_{z}", (-55.5, 13.5, z), (-30, 26.5, z), 0.7, m["stone_light"])
        add_beam(f"VIS_EAST_BUTTRESS_ARCH_{z}", (55.5, 13.5, z), (20, 25.0, z), 0.7, m["stone_light"])

    for z in (-56, -44, -32, -20, -8):
        add_gothic_window(f"VIS_NAVE_TALL_WINDOW_W_{z}", -27.98, 23.0, z, True, m["stone_light"], m["glass"])
        add_gothic_window(f"VIS_NAVE_TALL_WINDOW_E_{z}", 27.98, 22.0, z, True, m["stone_light"], m["glass"])

    for x in (-30, -18, -6, 6, 18, 30):
        add_box(f"VIS_BROKEN_ROOF_RIB_{x}", (x, 32.5, -28), (0.8, 2.2, 86), m["stone_dark"], 0.06)
        if x % 12 == 0:
            add_box(f"VIS_RUINED_PARAPET_GAP_{x}", (x, 18.6, 24.4), (4.6, 2.0, 0.8), m["stone_dark"], 0.03)

    # The interactive fog plane is generated at runtime; keep the center clear
    # but expose a visible exterior gatehouse frame around it.
    add_box("VIS_EXTERIOR_GATEHOUSE_L_PIER", (-56.85, 4.7, -12.8), (3.0, 9.4, 2.0), m["stone_light"], 0.1)
    add_box("VIS_EXTERIOR_GATEHOUSE_R_PIER", (-56.85, 4.7, 2.8), (3.0, 9.4, 2.0), m["stone_light"], 0.1)
    add_box("VIS_EXTERIOR_GATEHOUSE_TOP_BEAM", (-56.85, 8.7, -5.0), (3.1, 1.6, 17.6), m["stone_light"], 0.08)
    add_beam("VIS_EXTERIOR_GATEHOUSE_ARCH_N", (-56.85, 6.0, -12.8), (-56.85, 9.5, -5.0), 0.95, m["stone_light"])
    add_beam("VIS_EXTERIOR_GATEHOUSE_ARCH_S", (-56.85, 6.0, 2.8), (-56.85, 9.5, -5.0), 0.95, m["stone_light"])
    add_cylinder("VIS_EXTERIOR_GATEHOUSE_TOWER_N", (-58.2, 6.0, -16.6), 3.1, 12.0, m["stone"], 14)
    add_cylinder("VIS_EXTERIOR_GATEHOUSE_TOWER_S", (-58.2, 6.0, 6.6), 3.1, 12.0, m["stone"], 14)
    add_cylinder("VIS_EXTERIOR_GATEHOUSE_TOWER_N_CAP", (-58.2, 12.25, -16.6), 3.3, 0.8, m["stone_light"], 14)
    add_cylinder("VIS_EXTERIOR_GATEHOUSE_TOWER_S_CAP", (-58.2, 12.25, 6.6), 3.3, 0.8, m["stone_light"], 14)
    add_cone("VIS_EXTERIOR_GATEHOUSE_TOWER_N_SPIRE", (-58.2, 16.2, -16.6), 3.2, 0.18, 7.2, m["stone_dark"], 14)
    add_cone("VIS_EXTERIOR_GATEHOUSE_TOWER_S_SPIRE", (-58.2, 16.2, 6.6), 3.2, 0.18, 7.2, m["stone_dark"], 14)
    for z in (-12.8, 2.8):
        add_box(f"VIS_EXTERIOR_GATEHOUSE_BUTTRESS_{z}", (-60.0, 3.8, z), (3.1, 7.6, 1.0), m["stone"], 0.08)
    for z in (-16.6, 6.6):
        for angle in range(0, 360, 90):
            rad = math.radians(angle)
            add_box(
                f"VIS_EXTERIOR_GATEHOUSE_MERLON_{z}_{angle}",
                (-58.2 + math.cos(rad) * 2.95, 13.05, z + math.sin(rad) * 2.95),
                (0.65, 1.1, 0.65),
                m["stone_light"],
                0.04,
            )
    for z in (-30, -20, -12, 0, 11):
        add_gothic_window(f"VIS_FRONT_WINDOW_{z}", -28.04, 6.2, z, True, m["stone_light"], m["glass"])
    add_torch_socket("SOCKET_FOG_GATE", (-61.58, 2.3, -5))
    add_torch_socket("SOCKET_ENTRY", (-61.58, 1.0, -5))
    add_torch_socket("SOCKET_OUTDOOR_EXIT", (-61.58, 1.0, -5))
    add_collision_box("COL_BOX_EXTERIOR_WEST_NORTH", (-55.7, 4.0, -43.7), (1.8, 8.0, 72.6), min_y=0, max_y=8)
    add_collision_box("COL_BOX_EXTERIOR_WEST_SOUTH", (-55.7, 4.0, 10.7), (1.8, 8.0, 26.6), min_y=0, max_y=8)
    add_collision_box("COL_BOX_EXTERIOR_EAST", (56.0, 4.0, -28.0), (4.0, 8.0, 104.0), min_y=0, max_y=8)
    add_collision_box("COL_BOX_EXTERIOR_NORTH", (0.0, 4.0, -80.0), (112.0, 8.0, 4.0), min_y=0, max_y=8)
    add_collision_box("COL_BOX_EXTERIOR_SOUTH", (0.0, 4.0, 24.0), (112.0, 8.0, 4.0), min_y=0, max_y=8)


def build_gatehouse():
    m = materials()
    add_box("VIS_GATE_FLOOR", (0, -0.15, 8), (14, 0.3, 16), m["stone_dark"], 0.08)
    for x in (-6.75, 6.75):
        add_box(f"VIS_GATE_WALL_{x}", (x, 4, 8), (0.5, 8, 16), m["stone"], 0.12)
        for z in (3, 8, 13):
            add_beam(f"VIS_GATE_RIB_{x}_{z}", (x, 0.3, z), (x, 7.2, z), 0.45, m["stone_light"])
    for z in (0.25, 15.75):
        add_pointed_arch(f"VIS_GATE_PORTAL_{z}", (0, 0, z), 4.8, 4.7, 7.4, 0.65, m["stone_light"])
    for x in (-6.35, 6.35):
        for z in (4.2, 11.8):
            add_box(f"VIS_GATE_ATTACHED_PIER_{x}_{z}", (x, 3.2, z), (0.7, 6.4, 0.8), m["stone_light"], 0.08)
    for z in (4, 8, 12):
        add_beam(f"VIS_GATE_CEILING_RIB_L_{z}", (-6.2, 5.2, z), (0, 7.7, z), 0.34, m["stone_light"])
        add_beam(f"VIS_GATE_CEILING_RIB_R_{z}", (6.2, 5.2, z), (0, 7.7, z), 0.34, m["stone_light"])
    add_torch_socket("SOCKET_TORCH_01", (-2.6, 2.2, 12))
    add_torch_socket("SOCKET_TORCH_02", (2.6, 2.2, 12))


def build_courtyard():
    m = materials()
    add_box("VIS_COURTYARD_FLOOR", (0, -0.16, -12), (28, 0.32, 24), m["stone_dark"], 0.08)
    for x in (-13.75, 13.75):
        for z, length in ((-22.25, 3.5), (-12, 8), (-1.75, 3.5)):
            add_box(f"VIS_COURTYARD_SIDE_WALL_{x}_{z}", (x, 3.5, z), (0.5, 7, length), m["stone"], 0.12)
        for z in (-19, -12, -5):
            add_beam(f"VIS_COURTYARD_BUTTRESS_{x}_{z}", (x, 0.2, z), (x, 7.2, z), 0.55, m["stone_light"])

    for z in (-0.25, -23.75):
        add_box(f"VIS_COURTYARD_END_WALL_L_{z}", (-8.5, 3.5, z), (11, 7, 0.5), m["stone"], 0.12)
        add_box(f"VIS_COURTYARD_END_WALL_R_{z}", (8.5, 3.5, z), (11, 7, 0.5), m["stone"], 0.12)
        add_pointed_arch(f"VIS_COURTYARD_PORTAL_{z}", (0, 0, z), 4.8, 4.7, 7.4, 0.65, m["stone_light"])

    add_cylinder("VIS_COURTYARD_WELL_BASE", (0, 0.4, -12), 1.55, 0.8, m["stone_light"], 14)
    add_cylinder("VIS_COURTYARD_WELL_RIM", (0, 0.9, -12), 1.8, 0.35, m["stone"], 14)
    add_box("VIS_COURTYARD_WELL_POST_L", (-1.25, 2.2, -12), (0.28, 2.8, 0.28), m["wood"], 0.04)
    add_box("VIS_COURTYARD_WELL_POST_R", (1.25, 2.2, -12), (0.28, 2.8, 0.28), m["wood"], 0.04)
    add_beam("VIS_COURTYARD_WELL_BEAM", (-1.45, 3.5, -12), (1.45, 3.5, -12), 0.3, m["wood"])
    add_torch_socket("SOCKET_TORCH_01", (-6, 2.2, -20))
    add_torch_socket("SOCKET_TORCH_02", (6, 2.2, -20))


def build_great_hall():
    m = materials()
    add_box("VIS_HALL_FLOOR", (0, -0.18, -34), (20, 0.35, 20), m["stone_dark"], 0.08)
    for x in (-9.75, 9.75):
        add_box(f"VIS_HALL_SIDE_WALL_FRONT_{x}", (x, 5, -28.25), (0.5, 10, 8.5), m["stone"], 0.12)
        add_box(f"VIS_HALL_SIDE_WALL_REAR_{x}", (x, 5, -39.75), (0.5, 10, 8.5), m["stone"], 0.12)
        add_pointed_arch(f"VIS_HALL_SIDE_ARCH_{x}", (x, 0, -34), 3.2, 3.2, 5.2, 0.35, m["stone_light"])
    add_box("VIS_HALL_END_WALL_L", (-5.8, 5, -43.75), (8.4, 10, 0.5), m["stone"], 0.12)
    add_box("VIS_HALL_END_WALL_R", (5.8, 5, -43.75), (8.4, 10, 0.5), m["stone"], 0.12)
    add_box("VIS_HALL_END_WALL_TOP", (0, 7.0, -43.75), (3.2, 6.0, 0.5), m["stone"], 0.12)
    add_pointed_arch("VIS_HALL_EXIT_FRAME", (0, 0, -43.45), 2.2, 2.8, 3.8, 0.4, m["stone_light"])
    for x in (-9.35, 9.35):
        for z in (-28, -34, -40):
            add_box(f"VIS_HALL_WALL_PIER_{x}_{z}", (x, 3.8, z), (0.75, 7.6, 0.9), m["stone_light"], 0.08)
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
    add_torch_socket("SOCKET_EXIT", (0, 1.0, -42.8))


def build_wing(side, label):
    m = materials()
    x = side * 21
    outer_x = side * 27.75
    add_box(f"VIS_{label}_FLOOR", (x, -0.16, -10), (14, 0.32, 36), m["stone_dark"], 0.08)
    add_wall_z_with_door(f"VIS_{label}_OUTER_WALL", outer_x, 0, -10, 36, 8, 0.5, -26, 6.8, m["stone"])
    add_box(f"VIS_{label}_FRONT_WALL", (x, 4, 7.75), (14, 8, 0.5), m["stone"], 0.12)
    add_wall_x_with_door(f"VIS_{label}_REAR_WALL", x, 0, -27.75, 14, 8, 0.5, side * 21, 14.2, m["stone"])

    for z in (-21, -9, 3):
        add_box(f"VIS_{label}_ROOM_DIVIDER_{z}", (side * 24.2, 3.2, z), (7.1, 6.4, 0.35), m["stone_light"], 0.08)
        add_pointed_arch(f"VIS_{label}_ROOM_ARCH_{z}", (side * 18.3, 0, z), 3.2, 3.2, 5.2, 0.35, m["stone_light"])
        add_box(f"VIS_{label}_TABLE_{z}", (side * 24.4, 0.7, z + 3.0), (3.8, 1.4, 1.5), m["wood"], 0.1)

    # Visible stair treads match the runtime collision ramp.
    for index in range(12):
        t = (index + 0.5) / 12
        z = -17 + t * 14
        height = 5 * (1 - t)
        add_box(f"NO_SHADOW_{label}_STAIR_{index:02d}", (side * 18, height / 2, z), (3.6, height, 14 / 12 - 0.025), m["stone"], 0.04)
    for z in (-22, -4):
        add_torch_socket(f"SOCKET_TORCH_{abs(z):02d}", (side * 24.5, 2.2, z))


def build_north_wing():
    build_wing(-1, "NORTH_WING")


def build_south_wing():
    build_wing(1, "SOUTH_WING")


def build_upper_floor():
    m = materials()
    slabs = [
        ("HALL_NORTH", (0, 4.88, -39.6), (22, 0.24, 6.8)),
        ("HALL_SOUTH", (0, 4.88, -24.4), (22, 0.24, 6.8)),
        ("HALL_WEST", (-7.5, 4.88, -32), (7.0, 0.24, 8.4)),
        ("HALL_EAST", (7.5, 4.88, -32), (7.0, 0.24, 8.4)),
        ("BRIDGE", (0, 4.88, -20), (30, 0.24, 5)),
        ("TERRACE", (0, 4.88, 8), (30, 0.24, 12)),
        ("TERRACE_NORTH", (-18, 4.88, 8), (6, 0.24, 12)),
        ("TERRACE_SOUTH", (18, 4.88, 8), (6, 0.24, 12)),
    ]
    for side, label in ((-1, "NORTH"), (1, "SOUTH")):
        slabs.extend([
            (f"{label}_OUTER_STRIP", (side * 24.15, 4.88, -10), (7.7, 0.24, 36)),
            (f"{label}_INNER_STRIP", (side * 14.85, 4.88, -10), (1.7, 0.24, 36)),
            (f"{label}_STAIR_REAR", (side * 18, 4.88, -22.5), (4.6, 0.24, 11)),
            (f"{label}_STAIR_FRONT", (side * 18, 4.88, 2.75), (4.6, 0.24, 10.5)),
        ])
    for name, location, scale in slabs:
        add_box(f"NO_SHADOW_UPPER_{name}", location, scale, m["stone_dark"], 0.06)

    for side, label in ((-1, "NORTH"), (1, "SOUTH")):
        stair_x = side * 18
        add_box(f"VIS_{label}_STAIR_RAIL_L", (stair_x - 2.5, 5.55, -9.75), (0.25, 1.1, 14.5), m["stone_light"], 0.06)
        add_box(f"VIS_{label}_STAIR_RAIL_R", (stair_x + 2.5, 5.55, -9.75), (0.25, 1.1, 14.5), m["stone_light"], 0.06)

    add_box("VIS_UPPER_ROOF_BRIDGE", (0, 12.1, -20), (30, 0.6, 5), m["stone_dark"], 0.12)

    for x in (-27.75, 27.75):
        add_wall_z_with_door(f"VIS_UPPER_OUTER_WALL_{x}", x, 5, -12, 40, 4, 0.5, -26, 7.0, m["stone"])
        for z in (-26, -15, -4):
            add_box(f"VIS_UPPER_WINDOW_{x}_{z}_GLASS", (x, 7.1, z), (0.08, 2.4, 1.0), m["glass"])
    add_box("VIS_UPPER_REAR_WALL", (0, 7, -43.75), (56, 4, 0.5), m["stone"], 0.12)

    # A solid facade separates the vaulted interior from the open terrace.
    for x, width in ((-25.6, 4.8), (-10.6, 16.4), (10.6, 16.4), (25.6, 4.8)):
        add_box(f"VIS_TERRACE_DIVIDER_{x}", (x, 7.5, 2), (width, 5, 0.5), m["stone"], 0.12)
    # The west-facing terrace remains open to the real outdoor scene.
    for x in (-12, 12):
        add_box(f"VIS_TERRACE_PARAPET_{x}", (x, 5.7, 8), (0.5, 1.4, 12), m["stone_light"], 0.08)
    add_box("VIS_TERRACE_FRONT_PARAPET_L", (-20, 5.7, 13.75), (16, 1.4, 0.5), m["stone_light"], 0.08)
    add_box("VIS_TERRACE_FRONT_PARAPET_R", (20, 5.7, 13.75), (16, 1.4, 0.5), m["stone_light"], 0.08)

    for x in (-27.35, 27.35):
        for z in (-34, -20, -7):
            add_box(f"VIS_UPPER_WALL_PIER_{x}_{z}", (x, 7.2, z), (0.65, 4.4, 0.9), m["stone_light"], 0.06)
    add_torch_socket("SOCKET_TORCH_01", (-12, 7.1, -31))
    add_torch_socket("SOCKET_TORCH_02", (12, 7.1, -31))


def add_gatehouse_collision():
    add_collision_box("COL_BOX_GATE_WALL_L", (-6.75, 2.5, 8), (0.5, 5, 16))
    add_collision_box("COL_BOX_GATE_WALL_R", (6.75, 2.5, 8), (0.5, 5, 16))
    for x in (-4.7, 4.7):
        add_collision_box(f"COL_BOX_GATE_REAR_WALL_{x}", (x, 2.5, 15.75), (4.6, 5, 0.5))
        add_collision_box(f"COL_BOX_GATE_FRONT_WALL_{x}", (x, 2.5, 0.25), (4.6, 5, 0.5))
    add_collision_box("COL_BOX_GATE_REAR_DOOR_BLOCKER", (0, 2.5, 15.75), (4.8, 5, 0.5))
    add_collision_box("COL_BOX_GATE_TOWER_L", (-5.4, 5.5, 8), (3, 11, 3))
    add_collision_box("COL_BOX_GATE_TOWER_R", (5.4, 5.5, 8), (3, 11, 3))


def add_courtyard_collision():
    for x in (-13.75, 13.75):
        for z, length in ((-22.25, 3.5), (-12, 8), (-1.75, 3.5)):
            add_collision_box(f"COL_BOX_COURTYARD_SIDE_{x}_{z}", (x, 3, z), (0.5, 6, length))
    for z in (-0.25, -23.75):
        add_collision_box(f"COL_BOX_COURTYARD_END_L_{z}", (-8.5, 3, z), (11, 6, 0.5))
        add_collision_box(f"COL_BOX_COURTYARD_END_R_{z}", (8.5, 3, z), (11, 6, 0.5))
    add_collision_box("COL_BOX_COURTYARD_WELL", (0, 0.35, -12), (2.6, 0.7, 2.6), h=0.7)


def add_great_hall_collision():
    for x in (-9.75, 9.75):
        add_collision_box(f"COL_BOX_HALL_SIDE_FRONT_{x}", (x, 4, -28.25), (0.5, 8, 8.5))
        add_collision_box(f"COL_BOX_HALL_SIDE_REAR_{x}", (x, 4, -39.75), (0.5, 8, 8.5))
    for x in (-5.8, 5.8):
        add_collision_box(f"COL_BOX_HALL_FRONT_{x}", (x, 4, -24.25), (8.4, 8, 0.5))
        add_collision_box(f"COL_BOX_HALL_REAR_{x}", (x, 4.5, -43.75), (8.4, 9, 0.5))
    add_collision_box("COL_BOX_HALL_THRONE", (0, 0.65, -40.8), (4.5, 1.3, 1.5))
    add_collision_box("COL_BOX_HALL_EXIT_DOOR", (0, 1.4, -43.75), (2.0, 2.8, 0.5))


def add_wing_collision(side, label):
    x = side * 21
    add_collision_wall_z_with_door(f"COL_BOX_{label}_OUTER_WALL", side * 27.75, 0, -10, 36, 8, 0.5, -26, 6.8)
    add_collision_box(f"COL_BOX_{label}_FRONT_WALL", (x, 4, 7.75), (14, 8, 0.5))
    add_collision_wall_x_with_door(f"COL_BOX_{label}_REAR_WALL", x, 0, -27.75, 14, 8, 0.5, side * 21, 14.2)
    for z in (-20, -8, 4):
        add_collision_box(f"COL_BOX_{label}_ROOM_BLOCK_{z}", (side * 24.5, 1.4, z), (4.2, 2.8, 2.2))
    add_collision_ramp(f"COL_RAMP_{label}_STAIR", (side * 18, 2.5, -10), (3.6, 5, 14), h0=0, h1=5, reverse=True)
    add_collision_box(f"COL_BOX_{label}_STAIR_RAIL_L", (side * 18 - 2.0, 2.8, -10), (0.4, 5.6, 14), min_y=0, max_y=6)
    add_collision_box(f"COL_BOX_{label}_STAIR_RAIL_R", (side * 18 + 2.0, 2.8, -10), (0.4, 5.6, 14), min_y=0, max_y=6)


def add_upper_floor_collision():
    for name, location, scale in (
        ("HALL_NORTH", (0, 4.88, -39.6), (22, 0.24, 6.8)),
        ("HALL_SOUTH", (0, 4.88, -24.4), (22, 0.24, 6.8)),
        ("HALL_WEST", (-7.5, 4.88, -32), (7.0, 0.24, 8.4)),
        ("HALL_EAST", (7.5, 4.88, -32), (7.0, 0.24, 8.4)),
    ):
        add_collision_box(f"COL_SURFACE_UPPER_{name}", location, scale, surface=True, h=5)
    for side, label in ((-1, "NORTH"), (1, "SOUTH")):
        add_collision_box(f"COL_SURFACE_UPPER_{label}_OUTER", (side * 24.15, 4.88, -10), (7.7, 0.24, 36), surface=True, h=5)
        add_collision_box(f"COL_SURFACE_UPPER_{label}_INNER", (side * 14.85, 4.88, -10), (1.7, 0.24, 36), surface=True, h=5)
        add_collision_box(f"COL_SURFACE_UPPER_{label}_STAIR_REAR", (side * 18, 4.88, -22.5), (4.6, 0.24, 11), surface=True, h=5)
        add_collision_box(f"COL_SURFACE_UPPER_{label}_STAIR_FRONT", (side * 18, 4.88, 2.75), (4.6, 0.24, 10.5), surface=True, h=5)
        add_collision_box(f"COL_BOX_UPPER_{label}_RAIL_L", (side * 18 - 2.5, 5.55, -9.75), (0.25, 1.1, 14.5), min_y=5, max_y=6.1)
        add_collision_box(f"COL_BOX_UPPER_{label}_RAIL_R", (side * 18 + 2.5, 5.55, -9.75), (0.25, 1.1, 14.5), min_y=5, max_y=6.1)
    for name, location, scale in (
        ("BRIDGE", (0, 4.88, -20), (30, 0.24, 5)),
        ("TERRACE", (0, 4.88, 8), (30, 0.24, 12)),
        ("TERRACE_NORTH", (-18, 4.88, 8), (6, 0.24, 12)),
        ("TERRACE_SOUTH", (18, 4.88, 8), (6, 0.24, 12)),
    ):
        add_collision_box(f"COL_SURFACE_UPPER_{name}", location, scale, surface=True, h=5)
    for x in (-27.75, 27.75):
        add_collision_wall_z_with_door(f"COL_BOX_UPPER_OUTER_{x}", x, 5, -12, 40, 4, 0.5, -26, 7.0, min_y=5, max_y=9)
    add_collision_box("COL_BOX_UPPER_REAR", (0, 7, -43.75), (56, 4, 0.5), min_y=5, max_y=9)
    for x, width in ((-25.6, 4.8), (-10.6, 16.4), (10.6, 16.4), (25.6, 4.8)):
        add_collision_box(f"COL_BOX_UPPER_TERRACE_DIVIDER_{x}", (x, 7.5, 2), (width, 5, 0.5), min_y=5, max_y=10)
    for x in (-12, 12):
        add_collision_box(f"COL_BOX_UPPER_TERRACE_PARAPET_{x}", (x, 5.7, 8), (0.5, 1.4, 12), min_y=5, max_y=7)


def build_gatehouse_editable():
    build_gatehouse()
    add_gatehouse_collision()


def build_courtyard_editable():
    build_courtyard()
    add_courtyard_collision()


def build_great_hall_editable():
    build_great_hall()
    add_great_hall_collision()


def build_north_wing_editable():
    build_north_wing()
    add_wing_collision(-1, "NORTH")


def build_south_wing_editable():
    build_south_wing()
    add_wing_collision(1, "SOUTH")


def build_upper_floor_editable():
    build_upper_floor()
    add_upper_floor_collision()


def add_ring_floor(prefix, y, material, bevel=0.06):
    # Four slabs form an open atrium at the center.
    slabs = [
        ("NORTH", (0, y, -60), (84, 0.32, 24)),
        ("SOUTH", (0, y, 2), (84, 0.32, 24)),
        ("WEST", (-34, y, -29), (16, 0.32, 38)),
        ("EAST", (34, y, -29), (16, 0.32, 38)),
    ]
    if prefix == "VIS_ROOF_WALK":
        slabs[-1] = ("EAST", (22.4, y, -29), (39.1, 0.32, 38))
    for name, location, scale in slabs:
        add_box(f"{prefix}_{name}", location, scale, material, bevel)


def add_ring_floor_collision(prefix, h):
    slabs = [
        ("NORTH", (0, h - 0.12, -60), (84, 0.24, 24)),
        ("SOUTH", (0, h - 0.12, 2), (84, 0.24, 24)),
        ("WEST", (-34, h - 0.12, -29), (16, 0.24, 38)),
        ("EAST", (34, h - 0.12, -29), (16, 0.24, 38)),
    ]
    for name, location, scale in slabs:
        add_collision_box(f"COL_SURFACE_{prefix}_{name}", location, scale, surface=True, h=h)


def add_atrium_guardrails(prefix, y, material):
    rail_h = 1.2
    add_box(f"{prefix}_ATRIUM_RAIL_N", (0, y + rail_h / 2, -48), (28, rail_h, 0.45), material, 0.04)
    add_box(f"{prefix}_ATRIUM_RAIL_S", (0, y + rail_h / 2, -10), (28, rail_h, 0.45), material, 0.04)
    if prefix.endswith("_L1"):
        add_box(f"{prefix}_ATRIUM_RAIL_W_NORTH", (-14, y + rail_h / 2, -41), (0.45, rail_h, 14), material, 0.04)
        add_box(f"{prefix}_ATRIUM_RAIL_W_SOUTH", (-14, y + rail_h / 2, -17), (0.45, rail_h, 14), material, 0.04)
    else:
        add_box(f"{prefix}_ATRIUM_RAIL_W", (-14, y + rail_h / 2, -29), (0.45, rail_h, 38), material, 0.04)
    add_box(f"{prefix}_ATRIUM_RAIL_E", (14, y + rail_h / 2, -29), (0.45, rail_h, 38), material, 0.04)


def add_atrium_guardrail_collision(prefix, y):
    add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_N", (0, y + 0.6, -48), (28, 1.2, 0.45), min_y=y, max_y=y + 1.4)
    add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_S", (0, y + 0.6, -10), (28, 1.2, 0.45), min_y=y, max_y=y + 1.4)
    if prefix.endswith("_L1"):
        add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_W_NORTH", (-14, y + 0.6, -41), (0.45, 1.2, 14), min_y=y, max_y=y + 1.4)
        add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_W_SOUTH", (-14, y + 0.6, -17), (0.45, 1.2, 14), min_y=y, max_y=y + 1.4)
    else:
        add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_W", (-14, y + 0.6, -29), (0.45, 1.2, 38), min_y=y, max_y=y + 1.4)
    add_collision_box(f"COL_BOX_{prefix}_ATRIUM_RAIL_E", (14, y + 0.6, -29), (0.45, 1.2, 38), min_y=y, max_y=y + 1.4)


def add_spiral_stair_visual(prefix, m, x=-24, z=-29, bottom=0, top=20, radius=4.4, steps=54, phase=math.pi * 0.15):
    add_cylinder(f"{prefix}_CORE", (x, (top - bottom) / 2 + bottom, z), 0.75, top - bottom + 1.2, m["stone_dark"], 18)
    for i in range(steps):
        t = (i + 1) / steps
        angle = phase - t * math.pi * 5.35
        step_x = x + math.cos(angle) * radius
        step_z = z + math.sin(angle) * radius
        step_y = bottom + t * (top - bottom)
        step = add_box(f"{prefix}_STEP_{i:02d}", (step_x, step_y - 0.09, step_z), (3.2, 0.18, 1.35), m["stone"], 0.035)
        step.rotation_euler.z = -angle
        if i % 4 == 0:
            rail_x = x + math.cos(angle) * (radius + 1.55)
            rail_z = z + math.sin(angle) * (radius + 1.55)
            add_cylinder(f"{prefix}_RAIL_POST_{i:02d}", (rail_x, step_y + 0.52, rail_z), 0.08, 1.05, m["wood"], 8)
    for h in (5, 10, 15, 20):
        add_box(f"{prefix}_LANDING_{h}", (-27.8, h - 0.12, -29), (4.4, 0.24, 5.6), m["stone_dark"], 0.04)


def add_spiral_stair_collision(prefix, x=-24, z=-29, bottom=0, top=20, radius=4.4, steps=54, phase=math.pi * 0.15):
    add_collision_box(f"COL_BOX_{prefix}_CORE", (x, (top - bottom) / 2 + bottom, z), (1.5, top - bottom + 1.2, 1.5), min_y=bottom, max_y=top + 1.2)
    for i in range(steps):
        t = (i + 1) / steps
        angle = phase - t * math.pi * 5.35
        step_x = x + math.cos(angle) * radius
        step_z = z + math.sin(angle) * radius
        step_y = bottom + t * (top - bottom)
        add_collision_box(f"COL_SURFACE_{prefix}_STEP_{i:02d}", (step_x, step_y - 0.09, step_z), (3.1, 0.18, 2.1), surface=True, h=step_y)
    for h in (5, 10, 15, 20):
        add_collision_box(f"COL_SURFACE_{prefix}_LANDING_{h}", (-27.8, h - 0.12, -29), (4.4, 0.24, 5.6), surface=True, h=h)


def add_room_walls(prefix, y, material):
    room_width = 18
    door_width = 3.4
    for x in (-36, -18, 18, 36):
        add_wall_x_with_door(f"{prefix}_NORTH_ROOM_FRONT_{x}", x, y, -50, room_width, 5.2, 0.45, x, door_width, material)
        add_box(f"{prefix}_NORTH_ROOM_BACK_{x}", (x, y + 2.6, -72), (room_width, 5.2, 0.5), material, 0.08)
        add_box(f"{prefix}_NORTH_ROOM_SIDE_L_{x}", (x - room_width / 2, y + 2.6, -61), (0.45, 5.2, 22), material, 0.08)
        add_box(f"{prefix}_NORTH_ROOM_SIDE_R_{x}", (x + room_width / 2, y + 2.6, -61), (0.45, 5.2, 22), material, 0.08)
        add_box(f"{prefix}_NORTH_HEARTH_{x}", (x + 5.2, y + 0.65, -70.8), (2.4, 1.3, 0.8), material, 0.06)

    for x in (-36, -18, 18, 36):
        add_wall_x_with_door(f"{prefix}_SOUTH_ROOM_FRONT_{x}", x, y, -2, room_width, 5.2, 0.45, x, door_width, material)
        add_box(f"{prefix}_SOUTH_ROOM_BACK_{x}", (x, y + 2.6, 18), (room_width, 5.2, 0.5), material, 0.08)
        add_box(f"{prefix}_SOUTH_ROOM_SIDE_L_{x}", (x - room_width / 2, y + 2.6, 8), (0.45, 5.2, 20), material, 0.08)
        add_box(f"{prefix}_SOUTH_ROOM_SIDE_R_{x}", (x + room_width / 2, y + 2.6, 8), (0.45, 5.2, 20), material, 0.08)
        add_box(f"{prefix}_SOUTH_BED_BASE_{x}", (x - 4.8, y + 0.35, 15.2), (3.8, 0.7, 1.8), material, 0.04)


def add_room_collision(prefix, y):
    room_width = 18
    door_width = 3.4
    for x in (-36, -18, 18, 36):
        add_collision_wall_x_with_door(f"COL_BOX_{prefix}_NORTH_ROOM_FRONT_{x}", x, y, -50, room_width, 5.2, 0.45, x, door_width, min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_NORTH_ROOM_BACK_{x}", (x, y + 2.6, -72), (room_width, 5.2, 0.5), min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_NORTH_ROOM_SIDE_L_{x}", (x - room_width / 2, y + 2.6, -61), (0.45, 5.2, 22), min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_NORTH_ROOM_SIDE_R_{x}", (x + room_width / 2, y + 2.6, -61), (0.45, 5.2, 22), min_y=y, max_y=y + 5.2)

    for x in (-36, -18, 18, 36):
        add_collision_wall_x_with_door(f"COL_BOX_{prefix}_SOUTH_ROOM_FRONT_{x}", x, y, -2, room_width, 5.2, 0.45, x, door_width, min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_SOUTH_ROOM_BACK_{x}", (x, y + 2.6, 18), (room_width, 5.2, 0.5), min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_SOUTH_ROOM_SIDE_L_{x}", (x - room_width / 2, y + 2.6, 8), (0.45, 5.2, 20), min_y=y, max_y=y + 5.2)
        add_collision_box(f"COL_BOX_{prefix}_SOUTH_ROOM_SIDE_R_{x}", (x + room_width / 2, y + 2.6, 8), (0.45, 5.2, 20), min_y=y, max_y=y + 5.2)


def add_level_torches(prefix, y):
    for index, (x, z) in enumerate(((-36, -52), (36, -52), (-36, -6), (36, -6), (-12, -48), (12, -10)), 1):
        add_torch_socket(f"SOCKET_TORCH_{prefix}_{index:02d}", (x, y + 2.2, z))


def add_elevator_lever(index, y, material, metal):
    z = -25.8
    x = 4.2
    add_box(f"VIS_ELEVATOR_LEVER_BASE_{index:02d}", (x, y + 0.45, z), (0.9, 0.9, 0.35), material, 0.04)
    lever = add_box(f"VIS_ELEVATOR_LEVER_HANDLE_{index:02d}", (x, y + 1.05, z - 0.12), (0.16, 1.0, 0.16), metal, 0.03)
    lever.rotation_euler.x = math.radians(-24)
    add_torch_socket(f"SOCKET_ELEVATOR_LEVER_{index:02d}", (x, y + 1.0, z))


def add_window_band(prefix, y, stone, glass):
    for x in (-42, -30, -18, 18, 30, 42):
        add_gothic_window(f"{prefix}_NORTH_WINDOW_{x}", x, y + 2.7, -78.04, False, stone, glass)
        add_gothic_window(f"{prefix}_SOUTH_WINDOW_{x}", x, y + 2.7, 20.04, False, stone, glass)
    for z in (-66, -52, -38, -18, -4, 10):
        add_gothic_window(f"{prefix}_WEST_WINDOW_{z}", -50.04, y + 2.7, z, True, stone, glass)
        add_gothic_window(f"{prefix}_EAST_WINDOW_{z}", 50.04, y + 2.7, z, True, stone, glass)


def add_room_props(prefix, level, y, m):
    # Static silhouettes make each room readable without adding gameplay state.
    themes = [
        ("ARMORY", -36, -61, "metal"),
        ("LIBRARY", -18, -61, "wood"),
        ("CHAPEL", 18, -61, "stone_light"),
        ("PRISON", 36, -61, "metal"),
        ("KITCHEN", -36, 8, "stone_dark"),
        ("SERVANT", -18, 8, "wood"),
        ("ARCHIVE", 18, 8, "wood"),
        ("WARDEN", 36, 8, "stone_light"),
    ]
    for name, x, z, mat_key in themes:
        material = m[mat_key]
        add_box(f"{prefix}_{name}_TABLE", (x, y + 0.45, z), (4.4, 0.9, 1.6), material, 0.06)
        add_box(f"{prefix}_{name}_BACK", (x + 5.4, y + 1.7, z - 7.6), (1.2, 3.4, 0.5), material, 0.05)
        if name in {"ARMORY", "PRISON"}:
            for i, ox in enumerate((-2, 0, 2)):
                add_box(f"{prefix}_{name}_BARS_{i}", (x + ox, y + 1.8, z + 7.2), (0.16, 3.2, 0.16), m["metal"], 0.02)
        elif name == "CHAPEL":
            add_pointed_arch(f"{prefix}_{name}_ALTAR_ARCH", (x, y, z - 8.4), 3.8, y + 2.4, y + 4.6, 0.45, m["stone_light"])
        elif name in {"LIBRARY", "ARCHIVE"}:
            for i, ox in enumerate((-3.0, 0, 3.0)):
                add_box(f"{prefix}_{name}_SHELF_{i}", (x + ox, y + 1.8, z - 8.0), (1.4, 3.6, 0.5), m["wood"], 0.05)
        elif name == "KITCHEN":
            add_box(f"{prefix}_{name}_HEARTH", (x + 4.8, y + 0.9, z - 7.8), (3.0, 1.8, 0.9), m["stone_dark"], 0.06)


def build_atrium():
    m = materials()
    add_ring_floor("VIS_ATRIUM_FLOOR", -0.16, m["stone_dark"])
    add_spiral_stair_visual("VIS_ATRIUM_SPIRAL_STAIR", m)
    for y, label in ((0, "L1"), (5, "L2"), (10, "L3"), (15, "L4")):
        add_atrium_guardrails(f"VIS_ATRIUM_{label}", y, m["stone_light"])
    add_elevator_lever(1, 0, m["stone_light"], m["metal"])
    for x in (-50, 50):
        for z in (-60, -38, -18, 6):
            add_box(f"VIS_ATRIUM_PERIMETER_PIER_{x}_{z}", (x, 8.2, z), (0.8, 16.4, 1.1), m["stone_light"], 0.08)
    add_box("VIS_ELEVATOR_SHAFT_BACK", (0, 8, -36), (7.5, 16, 0.45), m["stone_dark"], 0.08)
    add_box("VIS_ELEVATOR_PLATFORM", (0, 0.15, -32), (5.2, 0.3, 5.2), m["metal"], 0.08)
    add_torch_socket("SOCKET_ELEVATOR_PLATFORM", (0, 0.2, -32))
    for index, y in enumerate((0, 5, 10, 15), 1):
        add_torch_socket(f"SOCKET_ELEVATOR_STOP_{index:02d}", (0, y, -32))
    add_level_torches("ATRIUM", 0)


def add_atrium_collision():
    add_ring_floor_collision("ATRIUM_L1", 0)
    add_spiral_stair_collision("ATRIUM_SPIRAL_STAIR")
    for y, label in ((0, "L1"), (5, "L2"), (10, "L3"), (15, "L4")):
        add_atrium_guardrail_collision(f"ATRIUM_{label}", y)
    add_collision_box("COL_BOX_ELEVATOR_SHAFT_BACK", (0, 8, -36), (7.5, 16, 0.45), min_y=0, max_y=16)


def build_atrium_editable():
    build_atrium()
    add_atrium_collision()


def build_floor_level(level, y):
    m = materials()
    prefix = f"VIS_FLOOR_{level}"
    add_ring_floor(f"{prefix}_SLAB", y - 0.16, m["stone_dark"])
    add_room_walls(prefix, y, m["stone"])
    add_room_props(prefix, level, y, m)
    add_atrium_guardrails(prefix, y, m["stone_light"])
    for x in (-50, 50):
        add_box(f"{prefix}_OUTER_WALL_{x}", (x, y + 2.8, -29), (0.5, 5.6, 86), m["stone"], 0.12)
    add_box(f"{prefix}_NORTH_WALL", (0, y + 2.8, -78), (100, 5.6, 0.5), m["stone"], 0.12)
    add_box(f"{prefix}_SOUTH_WALL", (0, y + 2.8, 20), (100, 5.6, 0.5), m["stone"], 0.12)
    add_window_band(prefix, y, m["stone_light"], m["glass"])
    if level == 4:
        for i in range(14):
            t = (i + 0.5) / 14
            z = 4 + t * 16
            height = 15 + t * 5
            add_box(f"NO_SHADOW_ROOF_SECRET_STAIR_{i:02d}", (42, 15 + (height - 15) / 2, z), (3.2, height - 15, 16 / 14 - 0.025), m["stone"], 0.04)
        add_box("VIS_ROOF_SECRET_DOOR_FRAME", (42, 17.4, 19.7), (4.0, 4.8, 0.5), m["stone_dark"], 0.08)
    add_level_torches(f"L{level}", y)


def add_floor_level_collision(level, y):
    prefix = f"FLOOR_{level}"
    add_ring_floor_collision(prefix, y)
    add_room_collision(prefix, y)
    add_atrium_guardrail_collision(prefix, y)
    for x in (-50, 50):
        add_collision_box(f"COL_BOX_{prefix}_OUTER_WALL_{x}", (x, y + 2.8, -29), (0.5, 5.6, 86), min_y=y, max_y=y + 5.6)
    add_collision_box(f"COL_BOX_{prefix}_NORTH_WALL", (0, y + 2.8, -78), (100, 5.6, 0.5), min_y=y, max_y=y + 5.6)
    add_collision_box(f"COL_BOX_{prefix}_SOUTH_WALL", (0, y + 2.8, 20), (100, 5.6, 0.5), min_y=y, max_y=y + 5.6)
    if level == 4:
        add_collision_ramp("COL_RAMP_ROOF_SECRET_STAIR", (42, 17.5, 12), (3.2, 5, 16), h0=15, h1=20)
        add_collision_box("COL_BOX_ROOF_SECRET_RAIL_L", (40.2, 17.8, 12), (0.35, 5.6, 16), min_y=15, max_y=21)
        add_collision_box("COL_BOX_ROOF_SECRET_RAIL_R", (43.8, 17.8, 12), (0.35, 5.6, 16), min_y=15, max_y=21)


def build_floor_3_editable():
    build_floor_level(3, 10)
    add_floor_level_collision(3, 10)


def build_floor_4_editable():
    build_floor_level(4, 15)
    add_floor_level_collision(4, 15)


def build_roof():
    m = materials()
    y = 20
    add_ring_floor("VIS_ROOF_WALK", y - 0.16, m["stone_dark"], 0.08)
    add_atrium_guardrails("VIS_ROOF", y, m["stone_light"])
    add_elevator_lever(5, y, m["stone_light"], m["metal"])
    add_box("VIS_ROOF_NORTH_PARAPET", (0, y + 0.8, -78), (100, 1.6, 0.7), m["stone_light"], 0.06)
    add_box("VIS_ROOF_SOUTH_PARAPET", (0, y + 0.8, 20), (100, 1.6, 0.7), m["stone_light"], 0.06)
    add_box("VIS_ROOF_WEST_PARAPET", (-50, y + 0.8, -29), (0.7, 1.6, 98), m["stone_light"], 0.06)
    add_box("VIS_ROOF_EAST_PARAPET", (50, y + 0.8, -29), (0.7, 1.6, 98), m["stone_light"], 0.06)
    for x, z in ((-42, -70), (42, -70), (-42, 12), (42, 12)):
        add_cylinder(f"VIS_ROOF_TOWER_{x}_{z}", (x, y + 2.8, z), 4.4, 5.6, m["stone"], 14)
        add_cone(f"VIS_ROOF_TOWER_SPIRE_{x}_{z}", (x, y + 7.0, z), 4.8, 0.35, 4.8, m["stone_dark"], 14)
        add_crenellations(f"VIS_ROOF_TOWER_CRENEL_{x}_{z}", x, z, 7.2, True, y + 5.9, m["stone_light"])
    for z in (-62, -44, -18, 4):
        add_box(f"VIS_ROOF_FLYING_BUTTRESS_W_{z}", (-52.5, y + 2.4, z), (3.8, 4.8, 0.7), m["stone_light"], 0.06)
        add_box(f"VIS_ROOF_FLYING_BUTTRESS_E_{z}", (52.5, y + 2.4, z), (3.8, 4.8, 0.7), m["stone_light"], 0.06)
    add_box("VIS_ROOF_SECRET_HATCH", (42, y + 0.1, 19.2), (4.4, 0.2, 2.2), m["wood"], 0.04)
    add_torch_socket("SOCKET_ROOF_EXIT", (0, y + 1.0, 21.5))
    add_level_torches("ROOF", y)


def add_roof_collision():
    y = 20
    add_collision_box("COL_SURFACE_ROOF_NORTH", (0, y - 0.12, -60), (84, 0.24, 24), surface=True, h=y)
    add_collision_box("COL_SURFACE_ROOF_SOUTH", (0, y - 0.12, 2), (84, 0.24, 24), surface=True, h=y)
    add_collision_box("COL_SURFACE_ROOF_WEST", (-34, y - 0.12, -29), (16, 0.24, 38), surface=True, h=y)
    add_collision_box("COL_SURFACE_ROOF_EAST", (22.4, y - 0.12, -29), (39.1, 0.24, 38), surface=True, h=y)
    add_collision_box("COL_SURFACE_ROOF_SECRET_HATCH", (42, y + 0.1, 19.2), (4.4, 0.2, 2.2), surface=True, h=y + 0.2)
    add_atrium_guardrail_collision("ROOF", y)
    add_collision_box("COL_BOX_ROOF_NORTH_PARAPET", (0, y + 0.8, -78), (100, 1.6, 0.7), min_y=y, max_y=y + 2)
    add_collision_box("COL_BOX_ROOF_SOUTH_PARAPET_L", (-28, y + 0.8, 20), (44, 1.6, 0.7), min_y=y, max_y=y + 2)
    add_collision_box("COL_BOX_ROOF_SOUTH_PARAPET_R", (28, y + 0.8, 20), (44, 1.6, 0.7), min_y=y, max_y=y + 2)
    add_collision_box("COL_BOX_ROOF_WEST_PARAPET", (-50, y + 0.8, -29), (0.7, 1.6, 98), min_y=y, max_y=y + 2)
    add_collision_box("COL_BOX_ROOF_EAST_PARAPET", (50, y + 0.8, -29), (0.7, 1.6, 98), min_y=y, max_y=y + 2)


def build_roof_editable():
    build_roof()
    add_roof_collision()


ZONE_EXPORTS = [
    {
        "id": "exterior",
        "collection": "ZONE_exterior",
        "builder": build_exterior,
        "path": OUT / "exterior" / "gatehouse.glb",
        "label": "gatehouse exterior",
        "budget": 150_000,
    },
    {
        "id": "gatehouse",
        "collection": "ZONE_gatehouse",
        "builder": build_gatehouse_editable,
        "path": OUT / "zones" / "gatehouse.glb",
        "label": "gatehouse interior",
        "budget": 120_000,
    },
    {
        "id": "courtyard",
        "collection": "ZONE_courtyard",
        "builder": build_courtyard_editable,
        "path": OUT / "zones" / "courtyard.glb",
        "label": "courtyard",
        "budget": 180_000,
    },
    {
        "id": "north-wing",
        "collection": "ZONE_north-wing",
        "builder": build_north_wing_editable,
        "path": OUT / "zones" / "north-wing.glb",
        "label": "north wing",
        "budget": 200_000,
    },
    {
        "id": "south-wing",
        "collection": "ZONE_south-wing",
        "builder": build_south_wing_editable,
        "path": OUT / "zones" / "south-wing.glb",
        "label": "south wing",
        "budget": 200_000,
    },
    {
        "id": "great-hall",
        "collection": "ZONE_great-hall",
        "builder": build_great_hall_editable,
        "path": OUT / "zones" / "great-hall.glb",
        "label": "great hall",
        "budget": 250_000,
    },
    {
        "id": "upper-floor",
        "collection": "ZONE_upper-floor",
        "builder": build_upper_floor_editable,
        "path": OUT / "zones" / "upper-floor.glb",
        "label": "upper floor",
        "budget": 300_000,
    },
    {
        "id": "atrium",
        "collection": "ZONE_atrium",
        "builder": build_atrium_editable,
        "path": OUT / "zones" / "atrium.glb",
        "label": "central atrium",
        "budget": 300_000,
    },
    {
        "id": "floor-3",
        "collection": "ZONE_floor-3",
        "builder": build_floor_3_editable,
        "path": OUT / "zones" / "floor-3.glb",
        "label": "third floor",
        "budget": 350_000,
    },
    {
        "id": "floor-4",
        "collection": "ZONE_floor-4",
        "builder": build_floor_4_editable,
        "path": OUT / "zones" / "floor-4.glb",
        "label": "fourth floor",
        "budget": 350_000,
    },
    {
        "id": "roof",
        "collection": "ZONE_roof",
        "builder": build_roof_editable,
        "path": OUT / "zones" / "roof.glb",
        "label": "roof",
        "budget": 300_000,
    },
]


def validate_scene(label, triangle_budget):
    triangles = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    if triangles > triangle_budget:
        raise RuntimeError(f"{label}: triangle budget exceeded ({triangles} > {triangle_budget})")
    print(f"{label}: {triangles} base triangles before modifiers")


def export_glb(path, label, triangle_budget, objects=None):
    if objects is None:
        validate_scene(label, triangle_budget)
    else:
        triangles = 0
        for obj in objects:
            if obj.type == "MESH" and not obj.name.startswith("COL_"):
                triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
        if triangles > triangle_budget:
            raise RuntimeError(f"{label}: triangle budget exceeded ({triangles} > {triangle_budget})")
        print(f"{label}: {triangles} base triangles before modifiers")
    path.parent.mkdir(parents=True, exist_ok=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    if objects is not None:
        for obj in objects:
            if obj.name.startswith("COL_"):
                continue
            obj.select_set(True)
        bpy.context.view_layer.objects.active = next((obj for obj in objects if obj.select_get()), None)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=objects is not None,
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


def remove_collection_recursive(collection):
    for child in list(collection.children):
        remove_collection_recursive(child)
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def rebuild_zone_collections():
    for collection in list(bpy.data.collections):
        if collection.name.startswith(ZONE_COLLECTION_PREFIX):
            remove_collection_recursive(collection)

    for spec in ZONE_EXPORTS:
        before = set(bpy.context.scene.objects)
        spec["builder"]()
        created = [obj for obj in bpy.context.scene.objects if obj not in before]
        collection = bpy.data.collections.new(spec["collection"])
        bpy.context.scene.collection.children.link(collection)
        for obj in created:
            collection.objects.link(obj)
            try:
                bpy.context.scene.collection.objects.unlink(obj)
            except RuntimeError:
                pass
    bpy.context.scene["castle_build_version"] = CASTLE_BUILD_VERSION


def ensure_master_blend():
    if MASTER_BLEND.exists():
        bpy.ops.wm.open_mainfile(filepath=str(MASTER_BLEND))
        if bpy.context.scene.get("castle_build_version") != CASTLE_BUILD_VERSION:
            rebuild_zone_collections()
            bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
            print(f"Updated editable master Blend to castle build version {CASTLE_BUILD_VERSION}: {MASTER_BLEND}")
        return

    reset_scene()
    rebuild_zone_collections()
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTER_BLEND))
    print(f"Created editable master Blend: {MASTER_BLEND}")


def collection_objects(collection):
    objects = list(collection.objects)
    for child in collection.children:
        objects.extend(collection_objects(child))
    return objects


def game_location(obj):
    return {
        "x": round(obj.location.x, 4),
        "y": round(obj.location.z, 4),
        "z": round(-obj.location.y, 4),
    }


def game_box(obj):
    return {
        "x": round(obj.location.x, 4),
        "z": round(-obj.location.y, 4),
        "hx": round(obj.dimensions.x * 0.5, 4),
        "hz": round(obj.dimensions.y * 0.5, 4),
    }


def custom_float(obj, key):
    value = obj.get(key)
    return None if value is None else float(value)


def manifest_collider(obj):
    data = game_box(obj)
    data["name"] = obj.name
    ctype = obj.get("collision_type", "box")
    if ctype == "ramp" or obj.name.startswith("COL_RAMP_"):
        data.update({
            "type": "ramp",
            "axis": obj.get("axis", "z"),
            "h0": custom_float(obj, "h0") or 0,
            "h1": custom_float(obj, "h1") or 0,
            "reverse": bool(obj.get("reverse", False)),
            "surface": True,
        })
    else:
        if bool(obj.get("surface", False)) or obj.name.startswith("COL_SURFACE_"):
            data["surface"] = True
        for key in ("minY", "maxY", "h"):
            value = custom_float(obj, key)
            if value is not None:
                data[key] = value
        if not data.get("surface"):
            if "minY" not in data:
                data["minY"] = round(obj.location.z - obj.dimensions.z * 0.5, 4)
            if "maxY" not in data:
                data["maxY"] = round(obj.location.z + obj.dimensions.z * 0.5, 4)
    return data


def export_manifest():
    manifest = {
        "version": 2,
        "buildVersion": CASTLE_BUILD_VERSION,
        "source": str(MASTER_BLEND.relative_to(ROOT)),
        "zones": {},
        "exterior": {
            "sockets": {},
            "colliders": [],
        },
        "elevator": {
            "platform": None,
            "stops": [],
            "levers": [],
        },
        "roofExit": None,
    }
    for spec in ZONE_EXPORTS:
        collection = bpy.data.collections.get(spec["collection"])
        if not collection:
            raise RuntimeError(f"Missing collection: {spec['collection']}")
        sockets = {}
        colliders = []
        for obj in collection_objects(collection):
            if obj.name.startswith("SOCKET_"):
                sockets[obj.name] = game_location(obj)
            elif obj.name.startswith("COL_"):
                colliders.append(manifest_collider(obj))
        if spec["id"] == "exterior":
            manifest["exterior"]["sockets"] = sockets
            manifest["exterior"]["colliders"] = colliders
        else:
            runtime = ZONE_RUNTIME.get(spec["id"], {})
            manifest["zones"][spec["id"]] = {
                **runtime,
                "colliders": colliders,
                "sockets": sockets,
            }
        for name, socket in sockets.items():
            if name == "SOCKET_ELEVATOR_PLATFORM":
                manifest["elevator"]["platform"] = socket
            elif name.startswith("SOCKET_ELEVATOR_STOP_"):
                manifest["elevator"]["stops"].append(socket)
            elif name.startswith("SOCKET_ELEVATOR_LEVER_"):
                socket["floorIndex"] = max(0, len(manifest["elevator"]["levers"]))
                manifest["elevator"]["levers"].append(socket)
            elif name == "SOCKET_ROOF_EXIT":
                manifest["roofExit"] = socket
    manifest["elevator"]["stops"].sort(key=lambda stop: stop["y"])
    manifest["elevator"]["levers"].sort(key=lambda lever: lever["y"])
    for lever in manifest["elevator"]["levers"]:
        if lever["y"] >= 20:
            lever["role"] = "roof-call"
            lever["floorIndex"] = -1
        else:
            lever["role"] = "floor-call"
            lever["floorIndex"] = 0
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Exported {MANIFEST}")


def export_from_master_blend():
    reset_scene()
    rebuild_zone_collections()
    for spec in ZONE_EXPORTS:
        collection = bpy.data.collections.get(spec["collection"])
        if not collection:
            raise RuntimeError(f"Missing collection: {spec['collection']}")
        objects = collection_objects(collection)
        export_glb(spec["path"], spec["label"], spec["budget"], objects=objects)
    export_manifest()


if __name__ == "__main__":
    import mathutils

    export_from_master_blend()
