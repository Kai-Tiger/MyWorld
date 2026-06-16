import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
TEXTURE_DIR = ROOT / "public" / "textures" / "ruined_houses"
OUTPUT = ROOT / "public" / "models" / "ruined_houses" / "ruined_houses.glb"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def image(path):
    return bpy.data.images.load(str(path), check_existing=True)


def make_pbr_material(name, color_path, normal_path, roughness_path, ao_path=None, tint=(1, 1, 1, 1), roughness=0.9, normal_strength=0.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = tint
    bsdf.inputs["Roughness"].default_value = roughness

    color = mat.node_tree.nodes.new("ShaderNodeTexImage")
    color.image = image(color_path)
    color.extension = "REPEAT"
    color.image.colorspace_settings.name = "sRGB"
    mat.node_tree.links.new(color.outputs["Color"], bsdf.inputs["Base Color"])

    rough = mat.node_tree.nodes.new("ShaderNodeTexImage")
    rough.image = image(roughness_path)
    rough.extension = "REPEAT"
    rough.image.colorspace_settings.name = "Non-Color"
    mat.node_tree.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])

    normal_tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    normal_tex.image = image(normal_path)
    normal_tex.extension = "REPEAT"
    normal_tex.image.colorspace_settings.name = "Non-Color"
    normal = mat.node_tree.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength
    mat.node_tree.links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    mat.node_tree.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    if ao_path:
        ao = mat.node_tree.nodes.new("ShaderNodeTexImage")
        ao.image = image(ao_path)
        ao.extension = "REPEAT"
        ao.image.colorspace_settings.name = "Non-Color"
        mix = mat.node_tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.factor_mode = "UNIFORM"
        mix.inputs["Factor"].default_value = 0.32
        mat.node_tree.links.new(color.outputs["Color"], mix.inputs["A"])
        mat.node_tree.links.new(ao.outputs["Color"], mix.inputs["B"])
        mat.node_tree.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])

    return mat


def make_flat_material(name, color, roughness=0.95):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def uv_box_project(obj, scale=1.0):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=scale, correct_aspect=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def add_cube(name, loc, scale, mat, rot=(0, 0, 0), uv_scale=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    uv_box_project(obj, uv_scale)
    obj.data.polygons.foreach_set("use_smooth", [False] * len(obj.data.polygons))
    return obj


def add_board(parent, name, loc, scale, mat, rot=(0, 0, 0), uv_scale=1.15):
    obj = add_cube(name, loc, scale, mat, rot, uv_scale)
    obj.parent = parent
    obj["ruined_house_part"] = "board"
    return obj


def add_roof_plane(parent, name, loc, scale, mat, rot=(0, 0, 0), uv_scale=1.4):
    obj = add_cube(name, loc, scale, mat, rot, uv_scale)
    obj.parent = parent
    obj["ruined_house_part"] = "thatch"
    return obj


def add_post(parent, name, loc, height, mat, lean_x=0.0, lean_z=0.0):
    obj = add_cube(
        name,
        loc,
        (0.18, height, 0.18),
        mat,
        (lean_z, 0, lean_x),
        0.85,
    )
    obj.parent = parent
    return obj


def add_loose_straw(parent, mat, x, y, z, rot_y, length=1.0, count=7):
    for i in range(count):
        off = (i - (count - 1) * 0.5) * 0.13
        strand = add_cube(
            f"loose_straw_{i}",
            (x + math.cos(rot_y) * off, y + i * 0.004, z - math.sin(rot_y) * off),
            (0.035, 0.035, length * (0.65 + (i % 3) * 0.13)),
            mat,
            (0.12 + i * 0.012, rot_y + (i % 2 - 0.5) * 0.16, 0.02),
            0.7,
        )
        strand.parent = parent


def add_rubble(parent, mat, center, amount=12, radius=1.4):
    for i in range(amount):
        a = i * 2.399
        r = radius * (0.25 + (i * 37 % 100) / 120)
        x = center[0] + math.cos(a) * r
        z = center[2] + math.sin(a) * r
        y = center[1] + 0.05 + (i % 4) * 0.015
        piece = add_cube(
            f"fallen_board_{i}",
            (x, y, z),
            (0.08 + (i % 3) * 0.03, 0.055, 0.55 + (i % 5) * 0.17),
            mat,
            (0.03 * (i % 4), a, 0.04 * ((i + 1) % 3)),
            0.85,
        )
        piece.parent = parent


def make_house(name, origin, yaw, width, depth, height, roof_drop, damage, wood_mat, dark_wood_mat, thatch_mat, floor_mat):
    group = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(group)
    group.location = origin
    group.rotation_euler[1] = damage.get("lean_z", 0)
    group.rotation_euler[2] = yaw

    half_w = width * 0.5
    half_d = depth * 0.5

    add_cube("dirt_floor", (0, 0.035, 0), (width * 0.96, 0.07, depth * 0.92), floor_mat, (0, 0, 0), 2.4).parent = group

    for sx in (-1, 1):
        for sz in (-1, 1):
            add_post(group, f"corner_post_{sx}_{sz}", (sx * half_w, height * 0.48, sz * half_d), height * (0.95 + 0.05 * sx * sz), dark_wood_mat, lean_x=0.06 * sx, lean_z=0.05 * sz)

    plank_h = 0.34
    rows = max(4, int(height / plank_h))
    gap_side = damage.get("missing_side", 1)
    for side, z in (("back", -half_d), ("front", half_d)):
        for row in range(rows):
            y = 0.33 + row * plank_h
            if side == "front" and -0.62 < 0 < 0.62 and row < 4:
                continue
            if side == "front" and row < 4:
                segments = [(-half_w + 0.52, 0.56), (half_w - 0.52, 0.56)]
            else:
                segments = [(0, width * (0.84 if row % 2 else 0.92))]
            for idx, (cx, seg_w) in enumerate(segments):
                if side == damage.get("broken_wall") and row in damage.get("missing_rows", ()) and idx == 0:
                    continue
                rot = (0.01 * (row % 3 - 1), 0.03 * (row % 2 - 0.5), 0.04 * ((row + idx) % 3 - 1))
                add_board(group, f"{side}_plank_{row}_{idx}", (cx, y, z), (seg_w, 0.15, 0.12), wood_mat, rot, 1.25)

    for side, x in (("left", -half_w), ("right", half_w)):
        for row in range(rows - 1):
            if side == "right" and row in damage.get("side_gap_rows", (2, 3)):
                continue
            y = 0.34 + row * plank_h
            if side == "left" and row == gap_side:
                segs = [(-half_d + 0.42, 0.62), (half_d - 0.42, 0.62)]
            else:
                segs = [(0, depth * 0.82)]
            for idx, (cz, seg_d) in enumerate(segs):
                add_board(
                    group,
                    f"{side}_plank_{row}_{idx}",
                    (x, y, cz),
                    (0.12, 0.15, seg_d),
                    wood_mat,
                    (0.025 * (row % 2), 0.02 * ((idx + row) % 3 - 1), 0.035 * (row % 3 - 1)),
                    1.18,
                )

    ridge_y = height + 0.62
    roof_pitch = 0.44
    for side in (-1, 1):
        rot_x = side * roof_pitch
        z = side * 0.34
        roof = add_roof_plane(
            group,
            f"thatch_roof_{side}",
            (0, ridge_y - 0.22, z),
            (width + 0.8, 0.20, depth * 0.70),
            thatch_mat,
            (rot_x, 0, 0.02 * side + damage.get("roof_twist", 0)),
            1.75,
        )
        roof.location.z += side * (half_d * 0.26)

    if damage.get("roof_hole"):
        add_roof_plane(
            group,
            "collapsed_roof_patch",
            (damage["roof_hole"][0], ridge_y - roof_drop, damage["roof_hole"][1]),
            (width * 0.32, 0.16, depth * 0.34),
            dark_wood_mat,
            (0.36, 0.2, -0.26),
            1.2,
        )

    add_board(group, "front_lintel", (0, 1.72, half_d + 0.04), (1.45, 0.20, 0.18), dark_wood_mat, (0.03, 0, -0.05), 1.0)
    add_board(group, "left_door_jamb", (-0.78, 0.88, half_d + 0.07), (0.16, 1.55, 0.20), dark_wood_mat, (0.02, 0, 0.08), 1.0)
    add_board(group, "right_door_jamb", (0.78, 0.82, half_d + 0.07), (0.16, 1.42, 0.20), dark_wood_mat, (-0.03, 0, -0.10), 1.0)

    add_loose_straw(group, thatch_mat, -half_w * 0.45, ridge_y - 0.32, half_d + 0.26, math.pi * 0.5, depth * 0.55, 9)
    add_loose_straw(group, thatch_mat, half_w * 0.34, ridge_y - 0.45, -half_d - 0.18, math.pi * 0.5, depth * 0.46, 6)
    add_rubble(group, dark_wood_mat, (damage.get("rubble_x", 0.6), 0, damage.get("rubble_z", half_d + 0.8)), 10 + damage.get("rubble", 0), 1.2)

    for obj in group.children:
        obj.location.x += damage.get("skew_x", 0) * obj.location.y
        obj.location.z += damage.get("skew_z", 0) * obj.location.y

    return group


def main():
    clear_scene()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    wood_mat = make_pbr_material(
        "Rotten Wood Planks",
        TEXTURE_DIR / "Wood061_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_AmbientOcclusion.jpg",
        roughness=0.96,
        normal_strength=0.55,
    )
    dark_wood_mat = make_pbr_material(
        "Charred Dark Timber",
        TEXTURE_DIR / "Wood061_1K-JPG_Color.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Wood061_1K-JPG_AmbientOcclusion.jpg",
        tint=(0.38, 0.28, 0.19, 1),
        roughness=0.98,
        normal_strength=0.42,
    )
    thatch_mat = make_pbr_material(
        "Dead Thatch Roof",
        TEXTURE_DIR / "Thatch_Dry_Color.jpg",
        TEXTURE_DIR / "Grass005_1K-JPG_NormalGL.jpg",
        TEXTURE_DIR / "Grass005_1K-JPG_Roughness.jpg",
        TEXTURE_DIR / "Grass005_1K-JPG_AmbientOcclusion.jpg",
        tint=(0.72, 0.57, 0.31, 1),
        roughness=1.0,
        normal_strength=0.68,
    )
    floor_mat = make_flat_material("Packed Dirt Interior", (0.17, 0.13, 0.10, 1), 1.0)

    make_house(
        "ruined_house_a",
        (-8.2, 0, -7.4),
        math.radians(28),
        3.6,
        2.9,
        2.25,
        0.64,
        {
            "lean_z": math.radians(-4.5),
            "skew_x": 0.025,
            "broken_wall": "back",
            "missing_rows": (1, 4),
            "side_gap_rows": (2, 5),
            "roof_hole": (-0.55, 0.2),
            "roof_twist": -0.04,
            "rubble": 2,
        },
        wood_mat,
        dark_wood_mat,
        thatch_mat,
        floor_mat,
    )
    make_house(
        "ruined_house_b",
        (8.5, 0, -8.8),
        math.radians(-24),
        3.1,
        3.2,
        2.05,
        0.72,
        {
            "lean_z": math.radians(5.5),
            "skew_z": -0.032,
            "broken_wall": "front",
            "missing_rows": (5,),
            "side_gap_rows": (1, 3, 4),
            "roof_hole": (0.48, -0.34),
            "roof_twist": 0.05,
            "rubble_x": -0.8,
            "rubble_z": 2.0,
            "rubble": 4,
        },
        wood_mat,
        dark_wood_mat,
        thatch_mat,
        floor_mat,
    )
    make_house(
        "ruined_house_c",
        (-1.4, 0, 10.4),
        math.radians(174),
        3.9,
        2.7,
        2.15,
        0.58,
        {
            "lean_z": math.radians(-3.0),
            "skew_x": -0.02,
            "skew_z": 0.02,
            "broken_wall": "back",
            "missing_rows": (2, 6),
            "side_gap_rows": (2,),
            "roof_hole": (0.2, 0.16),
            "roof_twist": -0.02,
            "rubble_x": 0.1,
            "rubble_z": -1.9,
            "rubble": 1,
        },
        wood_mat,
        dark_wood_mat,
        thatch_mat,
        floor_mat,
    )

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
            obj.data.name = obj.name + "_mesh"
        else:
            obj.select_set(False)

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
    )


if __name__ == "__main__":
    main()
