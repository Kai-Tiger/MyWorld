import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path.cwd()
SOURCE_BLEND = ROOT / "assets" / "blender" / "outdoor_landmarks.blend"
OUT_DIR = ROOT / "public" / "models" / "outdoor_landmarks"
OUT_MANIFEST = OUT_DIR / "outdoor-landmarks-manifest.json"
TEXTURE_DIR = ROOT / "public" / "textures"
DEAD_BRANCH_TEXTURE_DIR = TEXTURE_DIR / "outdoor_dead_branches"
ROCK_TEXTURE_DIR = ROOT / "public" / "models" / "rocks" / "namaqualand_boulder_03" / "textures"
BUILD_VERSION = 2


LANDMARKS = [
    {
        "id": "broken_canyon_bridge",
        "name": "Broken Canyon Bridge",
        "x": -78,
        "z": -18,
        "radius": 24,
    },
    {
        "id": "ruined_rock_gate",
        "name": "Ruined Rock Gate",
        "x": -36,
        "z": 34,
        "radius": 18,
    },
    {
        "id": "terraced_ruin_outcrop",
        "name": "Terraced Ruin Outcrop",
        "x": 72,
        "z": -42,
        "radius": 22,
    },
]

DEAD_BRANCH_CLUSTERS = [
    {"id": "spawn_west_deadfall", "x": -29, "z": -19, "rot": 0.35, "scale": 1.05, "hx": 2.8, "hz": 1.45},
    {"id": "spawn_south_fork", "x": -14, "z": -13, "rot": -0.4, "scale": 0.92, "hx": 2.25, "hz": 1.25},
    {"id": "spawn_southeast_twigs", "x": 13, "z": -20, "rot": 0.85, "scale": 0.86, "hx": 2.15, "hz": 1.2},
    {"id": "spawn_east_deadfall", "x": 27, "z": -9, "rot": -0.7, "scale": 1.0, "hx": 2.6, "hz": 1.35},
    {"id": "spawn_north_broken_limb", "x": 19, "z": 15, "rot": 0.2, "scale": 0.95, "hx": 2.35, "hz": 1.3},
    {"id": "spawn_northwest_fork", "x": -25, "z": 14, "rot": 1.2, "scale": 0.9, "hx": 2.1, "hz": 1.25},
    {"id": "spawn_far_north_tangle", "x": 1, "z": 28, "rot": -0.15, "scale": 1.08, "hx": 2.9, "hz": 1.55},
]


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.textures):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def p3(x, y, z):
    return (x, -z, y)


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


def mat(name, color, roughness=0.9, metallic=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def load_image(path, color_space):
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = color_space
    return image


def texture_node(material, path, color_space, label):
    node = material.node_tree.nodes.new("ShaderNodeTexImage")
    node.name = label
    node.label = label
    node.image = load_image(path, color_space)
    node.extension = "REPEAT"
    return node


def pbr_mat(name, color_path, normal_path, roughness_path, tint, normal_strength=0.38):
    material = mat(name, tint, 0.96)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (3.0, 3.0, 3.0)
    links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    color = texture_node(material, color_path, "sRGB", f"{name}_Color")
    rough = texture_node(material, roughness_path, "Non-Color", f"{name}_Roughness")
    normal_tex = texture_node(material, normal_path, "Non-Color", f"{name}_Normal")
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength

    links.new(mapping.outputs["Vector"], color.inputs["Vector"])
    links.new(mapping.outputs["Vector"], rough.inputs["Vector"])
    links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    links.new(color.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return material


def materials():
    return {
        "stone": pbr_mat(
            "Outdoor_Stone_Ash",
            TEXTURE_DIR / "castle_stone_wall_diff_1k.jpg",
            TEXTURE_DIR / "castle_stone_wall_nor_gl_1k.jpg",
            TEXTURE_DIR / "castle_stone_wall_rough_1k.jpg",
            (0.58, 0.56, 0.50),
        ),
        "dark_stone": pbr_mat(
            "Outdoor_Stone_Dark",
            TEXTURE_DIR / "castle_stone_wall_diff_1k.jpg",
            TEXTURE_DIR / "castle_stone_wall_nor_gl_1k.jpg",
            TEXTURE_DIR / "castle_stone_wall_rough_1k.jpg",
            (0.34, 0.33, 0.30),
            0.26,
        ),
        "rock": pbr_mat(
            "Outdoor_Rock_Facet",
            ROCK_TEXTURE_DIR / "namaqualand_boulder_03_diff_1k.jpg",
            ROCK_TEXTURE_DIR / "namaqualand_boulder_03_nor_gl_1k.jpg",
            ROCK_TEXTURE_DIR / "namaqualand_boulder_03_arm_1k.jpg",
            (0.42, 0.40, 0.36),
            0.44,
        ),
        "moss": mat("Outdoor_Dark_Moss", (0.20, 0.27, 0.17), 1.0),
        "wood": pbr_mat(
            "Outdoor_Dead_Wood",
            DEAD_BRANCH_TEXTURE_DIR / "wood_0063_color_1k.jpg",
            DEAD_BRANCH_TEXTURE_DIR / "wood_0063_normal_opengl_1k.png",
            DEAD_BRANCH_TEXTURE_DIR / "wood_0063_roughness_1k.jpg",
            (0.20, 0.13, 0.08),
            0.62,
        ),
        "collision": collision_mat(),
    }


def collision_mat():
    material = bpy.data.materials.get("Outdoor_Collision_Debug") or bpy.data.materials.new("Outdoor_Collision_Debug")
    material.diffuse_color = (1.0, 0.1, 0.0, 0.22)
    material.use_nodes = True
    material.blend_method = "BLEND"
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1.0, 0.1, 0.0, 0.22)
    bsdf.inputs["Alpha"].default_value = 0.22
    return material


def project_box_uvs(obj, tile_size=3.4):
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


def add_box(name, location, scale, material, bevel=0.0, rot_y=0.0):
    bpy.ops.mesh.primitive_cube_add(location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] * 0.5, scale[2] * 0.5, scale[1] * 0.5)
    obj.rotation_euler.z = -rot_y
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    project_box_uvs(obj)
    if bevel:
        bevel_mod = obj.modifiers.new("chipped_edges", "BEVEL")
        bevel_mod.width = bevel
        bevel_mod.segments = 1
        obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    return obj


def add_collision_box(name, location, scale, *, surface=False, min_y=None, max_y=None, h=None):
    obj = add_box(name, location, scale, collision_mat())
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


def add_collision_ramp(name, location, scale, *, axis="z", h0=0, h1=1, reverse=False):
    obj = add_collision_box(name, location, scale, surface=True)
    obj["collision_type"] = "ramp"
    obj["axis"] = axis
    obj["h0"] = float(h0)
    obj["h1"] = float(h1)
    obj["reverse"] = bool(reverse)
    return obj


def add_socket(name, location, rot_y=0.0):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=p3(*location), rotation=(0, 0, -rot_y))
    bpy.context.object.name = name


def add_rock(name, location, scale, material, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=p3(*location))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0], scale[2], scale[1])
    obj.rotation_euler = (seed * 0.31, seed * 0.47, seed * 0.19)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tex = bpy.data.textures.new(f"{name}_chip_noise", "VORONOI")
    tex.noise_scale = 1.7
    tex.intensity = 0.34
    displace = obj.modifiers.new("uneven_facets", "DISPLACE")
    displace.strength = 0.18
    displace.texture = tex
    obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(material)
    return obj


def add_beam(name, start, end, width, material, bevel=0.04):
    start_b = Vector(p3(*start))
    end_b = Vector(p3(*end))
    mid = (start_b + end_b) * 0.5
    direction = end_b - start_b
    bpy.ops.mesh.primitive_cube_add(location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width * 0.5, width * 0.5, direction.length * 0.5)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        bevel_mod = obj.modifiers.new("beam_chips", "BEVEL")
        bevel_mod.width = bevel
        bevel_mod.segments = 1
    return obj


def add_branch_segment(name, start, end, radius_start, radius_end, material, vertices=7):
    start_b = Vector(p3(*start))
    end_b = Vector(p3(*end))
    mid = (start_b + end_b) * 0.5
    direction = end_b - start_b
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=mid,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    apply_branch_uvs(obj, direction.length)
    obj.data.materials.append(material)
    obj.modifiers.new("dead_branch_weighted_normals", "WEIGHTED_NORMAL")
    return obj


def apply_branch_uvs(obj, length):
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="UVMap")
    inv_length = 1 / max(length, 0.001)
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            angle = math.atan2(vertex.y, vertex.x)
            u = (angle / (math.pi * 2)) % 1.0
            v = vertex.z * inv_length + 0.5
            uv_layer.data[loop_index].uv = (u, v)


def transform_branch_point(cluster, lx, ly, lz):
    rot = cluster["rot"]
    scale = cluster["scale"]
    c = math.cos(rot)
    s = math.sin(rot)
    x = cluster["x"] + (lx * c - lz * s) * scale
    z = cluster["z"] + (lx * s + lz * c) * scale
    return (x, ly * scale, z)


def add_dead_branch_cluster(cluster, index, material):
    prefix = f"VIS_DEAD_BRANCH_{index:02d}_{cluster['id'].upper()}"
    main_paths = [
        ((-2.4, 0.18, -0.2), (2.4, 0.22, 0.15), 0.18, 0.10),
        ((-1.7, 0.16, 0.75), (1.45, 0.20, -0.85), 0.13, 0.075),
        ((-1.05, 0.19, -0.95), (1.9, 0.16, 0.88), 0.11, 0.055),
    ]
    twig_paths = [
        ((-0.9, 0.24, 0.02), (-1.9, 0.28, 1.0), 0.075, 0.025),
        ((0.35, 0.24, 0.04), (1.4, 0.27, 0.95), 0.065, 0.02),
        ((0.95, 0.21, -0.2), (1.95, 0.24, -1.05), 0.055, 0.018),
        ((-0.3, 0.22, 0.18), (-1.25, 0.26, -0.9), 0.055, 0.018),
    ]
    for segment_index, (start, end, r0, r1) in enumerate(main_paths + twig_paths):
        add_branch_segment(
            f"{prefix}_SEGMENT_{segment_index:02d}",
            transform_branch_point(cluster, *start),
            transform_branch_point(cluster, *end),
            r0 * cluster["scale"],
            r1 * cluster["scale"],
            material,
        )
    add_collision_box(
        f"COL_SURFACE_DEAD_BRANCH_{cluster['id'].upper()}",
        (cluster["x"], 0.16, cluster["z"]),
        (cluster["hx"] * 2, 0.32, cluster["hz"] * 2),
        surface=True,
        h=0.32,
    )


def add_ramp_mesh(name, x, z, width, length, h0, h1, material, axis="z", reverse=False, thickness=0.28):
    low = h1 if reverse else h0
    high = h0 if reverse else h1
    if axis == "x":
        x0 = x - length * 0.5
        x1 = x + length * 0.5
        points = [
            (x0, low, z - width * 0.5),
            (x0, low, z + width * 0.5),
            (x1, high, z + width * 0.5),
            (x1, high, z - width * 0.5),
            (x0, low - thickness, z - width * 0.5),
            (x0, low - thickness, z + width * 0.5),
            (x1, high - thickness, z + width * 0.5),
            (x1, high - thickness, z - width * 0.5),
        ]
    else:
        z0 = z - length * 0.5
        z1 = z + length * 0.5
        points = [
            (x - width * 0.5, low, z0),
            (x + width * 0.5, low, z0),
            (x + width * 0.5, high, z1),
            (x - width * 0.5, high, z1),
            (x - width * 0.5, low - thickness, z0),
            (x + width * 0.5, low - thickness, z0),
            (x + width * 0.5, high - thickness, z1),
            (x - width * 0.5, high - thickness, z1),
        ]
    verts = [p3(*point) for point in points]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    project_box_uvs(obj)
    obj.modifiers.new("ramp_weighted_normals", "WEIGHTED_NORMAL")
    return obj


def add_arch(name, x, z, base_y, width, height, depth, material):
    pier_w = 1.6
    add_box(f"{name}_PIER_L", (x - width * 0.5, base_y + height * 0.32, z), (pier_w, height * 0.64, depth), material, 0.08)
    add_box(f"{name}_PIER_R", (x + width * 0.5, base_y + height * 0.32, z), (pier_w, height * 0.64, depth), material, 0.08)
    add_beam(f"{name}_ARCH_L", (x - width * 0.5, base_y + height * 0.64, z), (x, base_y + height, z), pier_w, material, 0.06)
    add_beam(f"{name}_ARCH_R", (x + width * 0.5, base_y + height * 0.64, z), (x, base_y + height, z), pier_w, material, 0.06)


def build_broken_bridge(m):
    y = 5.2
    x = -78
    z = -18
    add_box("VIS_BRIDGE_WEST_ABUTMENT", (x - 18.2, 2.6, z), (5.2, 5.2, 11.0), m["dark_stone"], 0.1)
    add_box("VIS_BRIDGE_EAST_ABUTMENT", (x + 18.2, 2.6, z), (5.2, 5.2, 11.0), m["dark_stone"], 0.1)
    add_box("VIS_BRIDGE_LEFT_SPAN", (x - 7.0, y - 0.18, z), (15.8, 0.36, 6.0), m["stone"], 0.08)
    add_box("VIS_BRIDGE_RIGHT_SPAN", (x + 7.8, y - 0.22, z), (13.2, 0.36, 6.0), m["stone"], 0.08)
    add_box("VIS_BRIDGE_CHIPPED_CENTER_SLAB", (x + 0.8, y - 0.28, z + 0.35), (4.4, 0.3, 4.9), m["stone"], 0.08, rot_y=0.18)
    add_box("VIS_BRIDGE_UNDER_ROAD", (x, 0.02, z), (42.0, 0.08, 5.6), m["moss"], 0.02)
    add_ramp_mesh("VIS_BRIDGE_WEST_APPROACH_RAMP", x - 25.0, z, 5.6, 9.0, 0.0, y, m["stone"], axis="x")
    add_ramp_mesh("VIS_BRIDGE_EAST_APPROACH_RAMP", x + 25.0, z, 5.6, 9.0, y, 0.0, m["stone"], axis="x")
    for i, px in enumerate((-16, -8, 8, 16)):
        add_box(f"VIS_BRIDGE_PARAPET_N_{i}", (x + px, y + 0.62, z - 3.35), (4.9, 1.15, 0.52), m["dark_stone"], 0.06)
        if i != 1:
            add_box(f"VIS_BRIDGE_PARAPET_S_{i}", (x + px, y + 0.62, z + 3.35), (4.6, 1.15, 0.52), m["dark_stone"], 0.06)
    for i, px in enumerate((-11.5, 11.5)):
        add_arch(f"VIS_BRIDGE_ARCH_{i}", x + px, z, 0.0, 9.0, 4.4, 1.0, m["stone"])
    for i, (rx, rz, sx, sy, sz) in enumerate((
        (-25.0, -5.5, 2.2, 2.0, 1.7),
        (24.0, 5.7, 1.8, 1.4, 2.2),
        (0.5, 4.6, 1.4, 0.9, 1.8),
    )):
        add_rock(f"VIS_BRIDGE_FALLEN_STONE_{i}", (x + rx, 0.75, z + rz), (sx, sy, sz), m["rock"], i + 3)

    add_collision_box("COL_SURFACE_BRIDGE_LEFT_SPAN", (x - 7.0, y - 0.12, z), (15.8, 0.24, 5.6), surface=True, h=y)
    add_collision_box("COL_SURFACE_BRIDGE_RIGHT_SPAN", (x + 7.8, y - 0.12, z), (13.2, 0.24, 5.6), surface=True, h=y)
    add_collision_ramp("COL_RAMP_BRIDGE_WEST_APPROACH", (x - 25.0, 2.6, z), (9.0, 5.2, 5.6), axis="x", h0=0.0, h1=y)
    add_collision_ramp("COL_RAMP_BRIDGE_EAST_APPROACH", (x + 25.0, 2.6, z), (9.0, 5.2, 5.6), axis="x", h0=y, h1=0.0)
    add_collision_box("COL_BOX_BRIDGE_PARAPET_N", (x, y + 0.62, z - 3.35), (37.0, 1.25, 0.62), min_y=y, max_y=y + 1.5)
    add_collision_box("COL_BOX_BRIDGE_PARAPET_S_W", (x - 11.8, y + 0.62, z + 3.35), (14.0, 1.25, 0.62), min_y=y, max_y=y + 1.5)
    add_collision_box("COL_BOX_BRIDGE_PARAPET_S_E", (x + 13.2, y + 0.62, z + 3.35), (11.0, 1.25, 0.62), min_y=y, max_y=y + 1.5)
    for i, px in enumerate((-18.2, 18.2)):
        add_collision_box(f"COL_BOX_BRIDGE_ABUTMENT_{i}", (x + px, 2.6, z), (5.2, 5.2, 11.0), min_y=-0.5, max_y=5.4)
    add_socket("SOCKET_LANDMARK_BROKEN_BRIDGE", (x, y + 0.1, z), 0)


def build_rock_gate(m):
    x = -36
    z = 34
    add_rock("VIS_ROCK_GATE_LEFT_MASS", (x - 6.8, 4.2, z), (3.8, 8.4, 5.4), m["rock"], 12)
    add_rock("VIS_ROCK_GATE_RIGHT_MASS", (x + 6.4, 4.0, z + 0.8), (4.2, 8.0, 5.2), m["rock"], 13)
    add_beam("VIS_ROCK_GATE_TOP_ARCH", (x - 5.4, 8.3, z + 0.2), (x + 5.4, 8.8, z + 0.6), 2.2, m["rock"], 0.08)
    add_beam("VIS_ROCK_GATE_BROKEN_RIB", (x - 2.2, 7.6, z - 2.2), (x + 4.8, 9.5, z + 2.2), 0.9, m["dark_stone"], 0.05)
    for i, (dx, dz, sx, sy, sz) in enumerate((
        (-12, -5, 2.4, 1.4, 2.1),
        (12, 6, 2.2, 1.6, 2.3),
        (-2, 7, 1.5, 1.0, 1.4),
        (4, -7, 1.6, 1.2, 1.6),
    )):
        add_rock(f"VIS_ROCK_GATE_SCREE_{i}", (x + dx, 0.8, z + dz), (sx, sy, sz), m["rock"], 20 + i)
    for i, dz in enumerate((-4.6, 4.6)):
        add_box(f"VIS_ROCK_GATE_BROKEN_WALL_{i}", (x, 1.2, z + dz), (7.6, 2.4, 0.8), m["dark_stone"], 0.07, rot_y=0.12 * (i + 1))

    add_collision_box("COL_BOX_ROCK_GATE_LEFT", (x - 6.8, 4.2, z), (6.0, 8.8, 8.0), min_y=-0.5, max_y=9.5)
    add_collision_box("COL_BOX_ROCK_GATE_RIGHT", (x + 6.4, 4.0, z + 0.8), (6.2, 8.6, 8.0), min_y=-0.5, max_y=9.5)
    add_collision_box("COL_BOX_ROCK_GATE_TOP", (x, 8.7, z + 0.4), (11.0, 2.0, 3.0), min_y=7.2, max_y=10.2)
    add_socket("SOCKET_LANDMARK_ROCK_GATE", (x, 0.1, z), 0)


def build_terraced_outcrop(m):
    x = 72
    z = -42
    add_rock("VIS_OUTCROP_BASE_MASS", (x, 2.1, z), (13.5, 4.2, 10.5), m["rock"], 31)
    add_box("VIS_OUTCROP_LOWER_TERRACE", (x - 3.4, 1.2, z + 2.4), (12.0, 0.42, 8.6), m["stone"], 0.08)
    add_box("VIS_OUTCROP_UPPER_TERRACE", (x + 5.0, 4.15, z - 3.0), (10.5, 0.42, 8.0), m["stone"], 0.08)
    add_ramp_mesh("VIS_OUTCROP_BENT_RAMP", x + 0.6, z - 0.4, 4.4, 12.0, 1.2, 4.15, m["stone"])
    add_box("VIS_OUTCROP_BROKEN_WALL_N", (x + 4.0, 5.05, z - 7.4), (8.2, 1.8, 0.62), m["dark_stone"], 0.07)
    add_box("VIS_OUTCROP_BROKEN_WALL_E", (x + 10.4, 4.95, z - 2.0), (0.62, 1.6, 6.8), m["dark_stone"], 0.07)
    add_box("VIS_OUTCROP_FALLEN_COLUMN", (x - 6.2, 1.95, z + 7.2), (1.1, 1.1, 6.8), m["dark_stone"], 0.04, rot_y=0.84)
    for i, (dx, dz, sy) in enumerate(((-8, -4, 2.2), (-9, 4, 1.8), (9, 5, 2.4), (13, -5, 1.7))):
        add_rock(f"VIS_OUTCROP_SIDE_BOULDER_{i}", (x + dx, sy * 0.48, z + dz), (2.2, sy, 2.4), m["rock"], 40 + i)

    add_collision_box("COL_SURFACE_OUTCROP_LOWER", (x - 3.4, 1.08, z + 2.4), (11.4, 0.24, 8.2), surface=True, h=1.2)
    add_collision_box("COL_SURFACE_OUTCROP_UPPER", (x + 5.0, 4.03, z - 3.0), (10.0, 0.24, 7.4), surface=True, h=4.15)
    add_collision_ramp("COL_RAMP_OUTCROP_CENTER", (x + 0.6, 2.66, z - 0.4), (4.4, 2.95, 12.0), h0=1.2, h1=4.15)
    add_collision_box("COL_BOX_OUTCROP_WALL_N", (x + 4.0, 5.05, z - 7.4), (8.2, 1.8, 0.62), min_y=4.1, max_y=6.0)
    add_collision_box("COL_BOX_OUTCROP_WALL_E", (x + 10.4, 4.95, z - 2.0), (0.62, 1.6, 6.8), min_y=4.1, max_y=5.8)
    add_socket("SOCKET_LANDMARK_OUTCROP", (x + 5.0, 4.2, z - 3.0), 0)


def build_scene():
    m = materials()
    build_broken_bridge(m)
    build_rock_gate(m)
    build_terraced_outcrop(m)
    for index, cluster in enumerate(DEAD_BRANCH_CLUSTERS):
        add_dead_branch_cluster(cluster, index, m["wood"])


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
    sockets = {}
    colliders = []
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("SOCKET_"):
            sockets[obj.name] = game_location(obj)
        elif obj.name.startswith("COL_"):
            colliders.append(manifest_collider(obj))
    manifest = {
        "version": 1,
        "buildVersion": BUILD_VERSION,
        "source": str(SOURCE_BLEND.relative_to(ROOT)),
        "landmarks": LANDMARKS,
        "deadBranches": DEAD_BRANCH_CLUSTERS,
        "sockets": sockets,
        "colliders": colliders,
    }
    OUT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Exported {OUT_MANIFEST}")


def main():
    rebuild = "--rebuild" in sys.argv
    if SOURCE_BLEND.exists() and not rebuild:
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    else:
        reset_scene()
        build_scene()
        SOURCE_BLEND.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_BLEND))
        print(f"Saved {SOURCE_BLEND}")
    export_manifest()


if __name__ == "__main__":
    main()
