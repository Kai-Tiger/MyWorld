import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_BLEND = ROOT / "assets" / "blender" / "souls_vertical_terrain_preview.blend"
OUTPUT_GLB = ROOT / "public" / "models" / "terrain" / "souls_vertical_terrain_preview.glb"
OUTPUT_PNG = ROOT / "previews" / "souls_vertical_terrain_preview.png"
TEXTURE_DIR = ROOT / "public" / "textures" / "souls_terrain"
ROAD_TEXTURE_DIR = ROOT / "public" / "textures" / "road_paving_stones_150"
HEIGHT_VARIANCE_SCALE = 0.8


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_mat(name, color, roughness=0.94, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def make_invisible_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.0, 0.2, 1.0, 0.0)
    bsdf.inputs["Alpha"].default_value = 0.0
    return mat


def image(path):
    return bpy.data.images.load(str(path), check_existing=True)


def make_pbr_mat(
    name,
    color_path,
    normal_path,
    roughness_path,
    ao_path=None,
    tint=(1, 1, 1, 1),
    roughness=0.94,
    normal_strength=0.45,
    use_vertex_blend_mask=False,
):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = tint
    bsdf.inputs["Roughness"].default_value = roughness

    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (4.0, 4.0, 4.0)
    links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    color = nodes.new("ShaderNodeTexImage")
    color.image = image(color_path)
    color.extension = "REPEAT"
    color.image.colorspace_settings.name = "sRGB"
    links.new(mapping.outputs["Vector"], color.inputs["Vector"])
    base_color_output = color.outputs["Color"]

    rough = nodes.new("ShaderNodeTexImage")
    rough.image = image(roughness_path)
    rough.extension = "REPEAT"
    rough.image.colorspace_settings.name = "Non-Color"
    links.new(mapping.outputs["Vector"], rough.inputs["Vector"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = image(normal_path)
    normal_tex.extension = "REPEAT"
    normal_tex.image.colorspace_settings.name = "Non-Color"
    links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    if ao_path:
        ao = nodes.new("ShaderNodeTexImage")
        ao.image = image(ao_path)
        ao.extension = "REPEAT"
        ao.image.colorspace_settings.name = "Non-Color"
        links.new(mapping.outputs["Vector"], ao.inputs["Vector"])
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.factor_mode = "UNIFORM"
        mix.inputs["Factor"].default_value = 0.28
        links.new(color.outputs["Color"], mix.inputs["A"])
        links.new(ao.outputs["Color"], mix.inputs["B"])
        base_color_output = mix.outputs["Result"]

    if use_vertex_blend_mask:
        attr = nodes.new("ShaderNodeAttribute")
        attr.attribute_name = "terrain_blend_mask"
        keep_color = nodes.new("ShaderNodeMix")
        keep_color.data_type = "RGBA"
        keep_color.factor_mode = "UNIFORM"
        keep_color.inputs["Factor"].default_value = 0.0
        links.new(base_color_output, keep_color.inputs["A"])
        links.new(attr.outputs["Color"], keep_color.inputs["B"])
        base_color_output = keep_color.outputs["Result"]

    links.new(base_color_output, bsdf.inputs["Base Color"])

    return mat


def terrain_height(x, z):
    def sharp_ridge(value, power=4):
        return math.copysign(abs(math.sin(value)) ** power, math.sin(value))

    ridge = 2.3 * math.sin(x * 0.22) + 1.5 * math.cos(z * 0.25)
    pit = -5.8 * math.exp(-((x + 8) ** 2 / 120 + (z + 2) ** 2 / 44))
    high_keep = 6.4 * math.exp(-((x - 13) ** 2 / 86 + (z - 8) ** 2 / 70))
    terrace = 2.1 * math.tanh((x + z * 0.25 - 5) * 0.24)
    path_cut = -1.6 * math.exp(-((z - 0.28 * x) ** 2 / 10))
    broad_noise = 0.35 * math.sin(x * 1.9 + z * 0.7) + 0.22 * math.sin(x * 0.9 - z * 1.6)
    fine_noise = (
        0.18 * math.sin(x * 3.7 + z * 1.4)
        + 0.12 * math.sin(x * 5.4 - z * 2.6)
        + 0.08 * math.sin(x * 8.2 + z * 4.7)
    )
    strata = 0.22 * sharp_ridge(x * 0.82 + z * 0.36, 5) + 0.16 * sharp_ridge(x * 1.15 - z * 0.58, 6)
    cracks = -0.34 * max(0, math.sin(x * 1.32 + z * 0.94 + math.sin(z * 0.4))) ** 7
    border = max(abs(x) / (44 / 2), abs(z) / (36 / 2))
    border_drop = (border - 0.86) * 10.0 if border > 0.86 else 0.0
    return (ridge + pit + high_keep + terrace + path_cut + broad_noise + fine_noise + strata + cracks - border_drop) * HEIGHT_VARIANCE_SCALE


def scaled_loc(loc):
    return (loc[0], loc[1] * HEIGHT_VARIANCE_SCALE, loc[2])


def cube_project_uv(obj, cube_size=3.0):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=cube_size, correct_aspect=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def add_cube(name, loc, scale, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=scaled_loc(loc), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    cube_project_uv(obj, max(scale))
    obj.data.polygons.foreach_set("use_smooth", [False] * len(obj.data.polygons))
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=7, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=scaled_loc(loc), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def create_terrain_mesh(mats):
    size_x = 44
    size_z = 36
    nx = 196
    nz = 160
    verts = []
    faces = []

    for iz in range(nz + 1):
        z = -size_z / 2 + size_z * iz / nz
        for ix in range(nx + 1):
            x = -size_x / 2 + size_x * ix / nx
            y = terrain_height(x, z)
            verts.append((x, y, z))

    for iz in range(nz):
        for ix in range(nx):
            a = iz * (nx + 1) + ix
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))

    mesh = bpy.data.meshes.new("souls_vertical_terrain_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="terrain_world_uv")
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            v = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = ((v.x + size_x * 0.5) / 5.0, (v.z + size_z * 0.5) / 5.0)
    blend_attr = mesh.color_attributes.new(name="terrain_blend_mask", type="FLOAT_COLOR", domain="CORNER")
    for poly in mesh.polygons:
        avg_y = sum(mesh.vertices[mesh.loops[li].vertex_index].co.y for li in poly.loop_indices) / len(poly.loop_indices)
        slope = 1.0 - abs(poly.normal.z)
        if poly.normal.z > 0.72 and avg_y < 1.2:
            blend = (0.12, 0.82, 0.06, 1.0)
        elif poly.normal.z > 0.58 and avg_y > 2.8 and slope < 0.32:
            blend = (0.22, 0.10, 0.78, 1.0)
        elif slope > 0.68 or avg_y < -2.0:
            blend = (0.55, 0.03, 0.02, 1.0)
        else:
            blend = (0.92, 0.06, 0.02, 1.0)
        for loop_index in poly.loop_indices:
            blend_attr.data[loop_index].color = blend

    obj = bpy.data.objects.new("souls_vertical_terrain_base", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mats["rock"])
    obj.data.materials.append(mats["dirt"])
    obj.data.materials.append(mats["moss"])
    obj.data.materials.append(mats["dark_rock"])
    for poly in obj.data.polygons:
        avg_y = sum(obj.data.vertices[obj.data.loops[li].vertex_index].co.y for li in poly.loop_indices) / len(poly.loop_indices)
        slope = 1.0 - abs(poly.normal.z)
        if poly.normal.z > 0.72 and avg_y < 1.2:
            poly.material_index = 1
        elif poly.normal.z > 0.58 and avg_y > 2.8 and slope < 0.32:
            poly.material_index = 2
        elif slope > 0.68 or avg_y < -2.0:
            poly.material_index = 3
        else:
            poly.material_index = 0
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    weighted = obj.modifiers.new("terrain_weighted_normals", "WEIGHTED_NORMAL")
    weighted.keep_sharp = True
    obj.select_set(False)
    return obj


def create_collision_proxy(mat):
    size_x = 44
    size_z = 36
    nx = 42
    nz = 34
    verts = []
    faces = []
    for iz in range(nz + 1):
        z = -size_z / 2 + size_z * iz / nz
        for ix in range(nx + 1):
            x = -size_x / 2 + size_x * ix / nx
            y = terrain_height(x, z) + 0.05
            verts.append((x, y, z))

    for iz in range(nz):
        for ix in range(nx):
            a = iz * (nx + 1) + ix
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))

    mesh = bpy.data.meshes.new("collision_souls_vertical_terrain_proxy_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("collision_souls_vertical_terrain_proxy", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.display_type = "WIRE"
    obj.hide_render = True
    obj["collision_proxy"] = True
    obj["source_mesh"] = "souls_vertical_terrain_base"
    return obj


def add_platform(name, x, y, z, sx, sz, mat, edge_mat):
    slab = add_cube(name, (x, y, z), (sx, 0.38, sz), mat)
    add_cube(f"{name}_front_edge", (x, y - 0.28, z + sz / 2), (sx + 0.3, 0.62, 0.32), edge_mat)
    add_cube(f"{name}_back_edge", (x, y - 0.26, z - sz / 2), (sx + 0.15, 0.54, 0.28), edge_mat)
    add_cube(f"{name}_left_edge", (x - sx / 2, y - 0.3, z), (0.30, 0.58, sz + 0.2), edge_mat)
    add_cube(f"{name}_right_edge", (x + sx / 2, y - 0.3, z), (0.26, 0.50, sz + 0.2), edge_mat)
    return slab


def add_stairs(name, start, end, steps, width, mat, broken_every=0):
    sx, sy, sz = start
    ex, ey, ez = end
    dx = (ex - sx) / steps
    dy = (ey - sy) / steps
    dz = (ez - sz) / steps
    yaw = math.atan2(dx, dz)
    run = math.sqrt(dx * dx + dz * dz)
    for i in range(steps):
        if broken_every and i % broken_every == broken_every - 1:
            continue
        jitter = 0.06 * math.sin(i * 2.1)
        add_cube(
            f"{name}_step_{i:02d}",
            (sx + dx * (i + 0.5), sy + dy * (i + 0.5), sz + dz * (i + 0.5)),
            (width * (0.92 + 0.08 * math.sin(i)), 0.22, run * 1.18),
            mat,
            (0.015 * math.sin(i), yaw + jitter, 0.01 * math.cos(i)),
        )


def add_broken_wall(name, center, length, height, mat, yaw=0.0, missing=(2, 5)):
    count = 8
    for i in range(count):
        if i in missing:
            continue
        t = (i - (count - 1) / 2) / count
        h = height * (0.55 + 0.5 * ((i * 37) % 100) / 100)
        x = center[0] + math.sin(yaw) * t * length
        z = center[2] + math.cos(yaw) * t * length
        add_cube(
            f"{name}_block_{i}",
            (x, center[1] + h / 2, z),
            (0.72, h, 0.42),
            mat,
            (0.02 * (i % 3 - 1), yaw + 0.04 * math.sin(i), 0.035 * (i % 2 - 0.5)),
        )


def add_bridge(name, start, end, width, mat, gap_index=4):
    sx, sy, sz = start
    ex, ey, ez = end
    pieces = 9
    dx = (ex - sx) / pieces
    dy = (ey - sy) / pieces
    dz = (ez - sz) / pieces
    yaw = math.atan2(dx, dz)
    run = math.sqrt(dx * dx + dz * dz)
    for i in range(pieces):
        if i == gap_index:
            continue
        add_cube(
            f"{name}_stone_{i}",
            (sx + dx * (i + 0.5), sy + dy * (i + 0.5), sz + dz * (i + 0.5)),
            (width * (0.85 + 0.1 * math.sin(i)), 0.28, run * 0.86),
            mat,
            (0.02 * math.sin(i), yaw + 0.03 * math.cos(i), 0.02 * math.sin(i * 1.7)),
        )


def scatter_rocks(mat):
    for i in range(118):
        a = i * 2.399
        ring = 5 + (i * 11 % 28)
        x = math.cos(a) * ring + math.sin(i) * 1.8
        z = math.sin(a) * ring * 0.75 + math.cos(i * 0.6) * 1.2
        y = -2.5 + 0.13 * (i % 7)
        if -5 < x < 8 and -3 < z < 4:
            y -= 1.8
        r = 0.25 + (i % 5) * 0.08
        obj = add_cylinder(f"jagged_rock_{i:02d}", (x, y, z), r, 0.45 + (i % 6) * 0.13, mat, vertices=7)
        obj.rotation_euler = (0.35 * math.sin(i), a, 0.28 * math.cos(i))


def add_cliff_strata(mat):
    for i in range(44):
        side = -1 if i % 2 == 0 else 1
        z = -15.5 + (i * 5.9 % 31)
        y = -2.2 + (i * 7 % 16) * 0.48
        x = side * (18.0 + (i * 13 % 7) * 0.42) + math.sin(i * 0.71) * 1.1
        length = 2.0 + (i % 5) * 0.75
        thickness = 0.12 + (i % 3) * 0.05
        shelf = add_cube(
            f"cliff_horizontal_strata_{i:02d}",
            (x, y, z),
            (length, thickness, 0.28),
            mat,
            (0.08 * math.sin(i), math.radians(80 + side * 8) + math.sin(i) * 0.18, 0.05 * math.cos(i)),
        )
        shelf.scale.x *= 0.75 + 0.35 * math.sin(i * 1.7)

    for i in range(26):
        x = -12.0 + (i * 3.1 % 25)
        z = -14.0 + (i * 5.3 % 28)
        y = -1.5 + (i * 11 % 18) * 0.42
        add_cube(
            f"knife_edge_rock_scar_{i:02d}",
            (x, y, z),
            (0.16 + (i % 3) * 0.04, 1.0 + (i % 6) * 0.28, 0.22),
            mat,
            (0.16 * math.sin(i), i * 0.37, 0.12 * math.cos(i * 0.8)),
        )


def add_archway(mat, dark_mat):
    add_cube("upper_ruin_left_pillar", (10.8, 6.4, 9.0), (0.8, 3.2, 0.8), mat, (0.04, 0.08, -0.03))
    add_cube("upper_ruin_right_pillar", (15.0, 6.2, 9.2), (0.75, 2.8, 0.8), mat, (-0.05, -0.08, 0.08))
    add_cube("upper_ruin_cracked_lintel", (12.9, 8.05, 9.1), (4.7, 0.55, 0.72), mat, (0.03, 0.02, -0.06))
    add_cube("upper_ruin_shadow_gap", (12.9, 6.7, 9.13), (2.0, 1.9, 0.78), dark_mat)


def add_route_markers(mat):
    add_cube("spawn_low_bonfire_plinth", (-14.5, -0.1, -10.8), (1.4, 0.35, 1.4), mat, (0, 0.7, 0))
    add_cylinder("spawn_low_bonfire_ash", (-14.5, 0.16, -10.8), 0.65, 0.12, mat, vertices=9)


def add_lighting():
    bpy.ops.object.light_add(type="SUN", location=(-8, 18, -12), rotation=(math.radians(45), 0, math.radians(-32)))
    sun = bpy.context.object
    sun.name = "cold_low_sun"
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)

    bpy.ops.object.light_add(type="AREA", location=(0, 10, -8), rotation=(math.radians(70), 0, 0))
    area = bpy.context.object
    area.name = "misty_overhead_fill"
    area.data.energy = 720
    area.data.size = 16

    bpy.context.scene.world = bpy.data.worlds.new("souls_preview_world") if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world.color = (0.065, 0.071, 0.080)


def add_camera():
    bpy.ops.object.camera_add(location=(-24, 13, -24))
    cam = bpy.context.object
    target = Vector((1.0, 2.7 * HEIGHT_VARIANCE_SCALE, 0.8))
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    cam.data.lens = 22
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = direction.length
    cam.data.dof.aperture_fstop = 9.0


def setup_render():
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 80
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    bpy.context.scene.view_settings.exposure = 1.15
    bpy.context.scene.view_settings.gamma = 1.0
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 950
    bpy.context.scene.eevee.taa_render_samples = 64


def main():
    clear_scene()
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PNG.parent.mkdir(parents=True, exist_ok=True)

    cliff_mat = make_pbr_mat(
        "PBR cracked cliff rock Rock063",
        TEXTURE_DIR / "Rock063_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_AmbientOcclusion.jpg",
        roughness=0.98,
        normal_strength=0.72,
        use_vertex_blend_mask=True,
    )
    path_mat = make_pbr_mat(
        "PBR worn flagstone path",
        ROAD_TEXTURE_DIR / "PavingStones150_1K-JPG_Color.jpg",
        ROAD_TEXTURE_DIR / "PavingStones150_1K-JPG_NormalGL.jpg",
        ROAD_TEXTURE_DIR / "PavingStones150_1K-JPG_Roughness.jpg",
        ROAD_TEXTURE_DIR / "PavingStones150_1K-JPG_AmbientOcclusion.jpg",
        roughness=0.96,
        normal_strength=0.42,
    )
    edge_mat = make_pbr_mat(
        "PBR broken dark rock edge",
        TEXTURE_DIR / "Rock063_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Rock063_1K-JPG_AmbientOcclusion.jpg",
        roughness=0.99,
        normal_strength=0.58,
        use_vertex_blend_mask=True,
    )
    dirt_mat = make_pbr_mat(
        "PBR wet packed earth Ground103",
        TEXTURE_DIR / "Ground103_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Ground103_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Ground103_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Ground103_1K-JPG_AmbientOcclusion.jpg",
        roughness=1.0,
        normal_strength=0.48,
        use_vertex_blend_mask=True,
    )
    moss_mat = make_pbr_mat(
        "PBR mossy rock Rock064",
        TEXTURE_DIR / "Rock064_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Rock064_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Rock064_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Rock064_1K-JPG_AmbientOcclusion.jpg",
        roughness=1.0,
        normal_strength=0.52,
        use_vertex_blend_mask=True,
    )
    shadow_mat = make_mat("deep arch shadow", (0.025, 0.025, 0.024, 1), 1.0)
    collision_mat = make_invisible_mat("invisible collision proxy material")

    terrain = create_terrain_mesh({
        "rock": cliff_mat,
        "dirt": dirt_mat,
        "moss": moss_mat,
        "dark_rock": edge_mat,
    })
    terrain.name = "base_high_low_cliff_terrain"
    create_collision_proxy(collision_mat)

    add_platform("low_spawn_ledge", -14.5, 0.0, -10.0, 7.0, 5.0, dirt_mat, edge_mat)
    add_platform("middle_switchback_platform", -3.8, 2.55, -2.2, 8.5, 4.0, path_mat, edge_mat)
    add_platform("broken_bridge_landing", 4.2, 4.1, 2.4, 5.8, 3.5, path_mat, edge_mat)
    add_platform("upper_keep_platform", 13.2, 6.2, 8.8, 8.0, 5.8, path_mat, edge_mat)
    add_platform("side_drop_overlook", -8.2, 4.15, 8.8, 5.4, 4.3, path_mat, edge_mat)

    add_stairs("low_to_middle_crooked_stairs", (-12.2, 0.25, -7.5), (-5.7, 2.5, -3.3), 16, 2.0, path_mat, broken_every=7)
    add_stairs("middle_to_bridge_steps", (-0.9, 2.82, -1.2), (3.6, 4.18, 1.6), 10, 1.65, path_mat, broken_every=0)
    add_stairs("overlook_side_stairs", (-5.2, 2.85, 1.0), (-8.1, 4.28, 7.3), 12, 1.45, path_mat, broken_every=5)
    add_stairs("upper_keep_final_steps", (6.7, 4.42, 3.2), (10.0, 6.26, 7.2), 13, 1.55, path_mat, broken_every=6)

    add_bridge("cracked_gap_bridge", (4.6, 4.35, 2.8), (7.5, 4.75, 5.4), 1.45, path_mat, gap_index=5)
    add_broken_wall("low_ledge_ruined_wall", (-14.8, 0.1, -7.4), 5.5, 1.5, edge_mat, yaw=math.radians(82), missing=(1, 6))
    add_broken_wall("middle_parapet", (-2.0, 2.75, -4.0), 7.0, 1.25, edge_mat, yaw=math.radians(96), missing=(3,))
    add_broken_wall("upper_keep_wall", (13.3, 6.3, 6.0), 7.5, 2.2, edge_mat, yaw=math.radians(88), missing=(2, 4))
    add_broken_wall("overlook_fallen_wall", (-8.3, 4.2, 11.1), 4.2, 1.4, edge_mat, yaw=math.radians(0), missing=(0, 5))

    add_archway(edge_mat, shadow_mat)
    add_route_markers(edge_mat)

    add_lighting()
    add_camera()
    setup_render()

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_attributes=True,
        export_extras=True,
        export_vertex_color="NAME",
        export_vertex_color_name="terrain_blend_mask",
        export_all_vertex_colors=True,
    )

    bpy.context.scene.render.filepath = str(OUTPUT_PNG)
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
