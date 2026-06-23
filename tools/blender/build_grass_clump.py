from pathlib import Path
import argparse
import math
import sys

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "models" / "grass"

GRASS_VARIANTS = [
    {
        "name": "grass_clump_low",
        "out_path": OUT_DIR / "grass_clump_low.glb",
        "material_color": (0.028, 0.045, 0.026, 1.0),
        "palette": {
            "root": (0.012, 0.027, 0.012, 1.0),
            "mid": (0.027, 0.051, 0.027, 1.0),
            "lit": (0.039, 0.071, 0.039, 1.0),
            "tip": (0.047, 0.078, 0.047, 1.0),
            "shadow": (0.000, 0.012, 0.004, 1.0),
        },
        "blade_count": 20,
        "blade_segments": 2,
        "height_base": 0.72,
        "height_step": 0.045,
        "height_cycle": 5,
        "width_base": 0.024,
        "width_step": 0.004,
        "width_cycle": 4,
        "bend_base": 0.16,
        "bend_step": 0.028,
        "bend_cycle": 6,
        "fan_base": 0.055,
        "fan_step": 0.011,
        "fan_cycle": 5,
        "droop": 0.55,
    },
    {
        "name": "grass_clump_fresh",
        "out_path": OUT_DIR / "grass_clump_fresh.glb",
        "material_color": (0.145, 0.235, 0.075, 1.0),
        "palette": {
            "root": (0.035, 0.075, 0.025, 1.0),
            "mid": (0.125, 0.245, 0.070, 1.0),
            "lit": (0.205, 0.355, 0.110, 1.0),
            "tip": (0.255, 0.410, 0.130, 1.0),
            "shadow": (0.015, 0.035, 0.012, 1.0),
        },
        "blade_count": 22,
        "blade_segments": 2,
        "height_base": 0.54,
        "height_step": 0.034,
        "height_cycle": 5,
        "width_base": 0.018,
        "width_step": 0.003,
        "width_cycle": 4,
        "bend_base": 0.08,
        "bend_step": 0.016,
        "bend_cycle": 6,
        "fan_base": 0.035,
        "fan_step": 0.007,
        "fan_cycle": 5,
        "droop": 0.28,
    },
    {
        "name": "grass_clump_dry",
        "out_path": OUT_DIR / "grass_clump_dry.glb",
        "material_color": (0.250, 0.205, 0.080, 1.0),
        "palette": {
            "root": (0.075, 0.058, 0.022, 1.0),
            "mid": (0.210, 0.165, 0.060, 1.0),
            "lit": (0.330, 0.260, 0.090, 1.0),
            "tip": (0.430, 0.335, 0.115, 1.0),
            "shadow": (0.040, 0.030, 0.012, 1.0),
        },
        "blade_count": 16,
        "blade_segments": 2,
        "height_base": 0.62,
        "height_step": 0.060,
        "height_cycle": 7,
        "width_base": 0.019,
        "width_step": 0.004,
        "width_cycle": 3,
        "bend_base": 0.22,
        "bend_step": 0.038,
        "bend_cycle": 6,
        "fan_base": 0.070,
        "fan_step": 0.015,
        "fan_cycle": 5,
        "droop": 0.92,
    },
    {
        "name": "grass_clump_60_ref",
        "out_path": OUT_DIR / "grass_clump_60_ref.glb",
        "material_color": (0.038, 0.062, 0.032, 1.0),
        "palette": {
            "root": (0.014, 0.028, 0.012, 1.0),
            "mid": (0.035, 0.066, 0.030, 1.0),
            "lit": (0.052, 0.092, 0.045, 1.0),
            "tip": (0.060, 0.105, 0.052, 1.0),
            "shadow": (0.004, 0.014, 0.005, 1.0),
        },
        "blade_count": 9,
        "blade_segments": 2,
        "height_base": 0.70,
        "height_step": 0.050,
        "height_cycle": 5,
        "width_base": 0.038,
        "width_step": 0.007,
        "width_cycle": 4,
        "bend_base": 0.17,
        "bend_step": 0.035,
        "bend_cycle": 6,
        "fan_base": 0.090,
        "fan_step": 0.017,
        "fan_cycle": 5,
        "droop": 0.58,
    },
]


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(variant):
    mat = bpy.data.materials.new(f"{variant['name']}_mat")
    mat.diffuse_color = variant["material_color"]
    mat.use_nodes = True
    mat.use_backface_culling = False
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = variant["material_color"]
        bsdf.inputs["Roughness"].default_value = 0.92

        vertex_color = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vertex_color.layer_name = "grass_color"
        mat.node_tree.links.new(vertex_color.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def add_blade(vertices, faces, angle, radius, height, width, bend, fan, droop_factor, segments=7):
    base_x = math.cos(angle) * radius
    base_y = math.sin(angle) * radius
    side_x = math.cos(angle + math.pi * 0.5)
    side_y = math.sin(angle + math.pi * 0.5)
    outward_x = math.cos(angle)
    outward_y = math.sin(angle)
    twist = math.sin(angle * 2.7) * 0.014

    root = len(vertices)
    for i in range(segments + 1):
        t = i / segments
        taper = (1 - t) ** 1.25
        w = width * taper
        curve = (1 - math.cos(t * math.pi * 0.78)) * bend
        side_fan = math.sin(t * math.pi * 0.72) * fan
        droop = max(0, t - 0.58) ** 2 * height * droop_factor
        sway = math.sin(t * math.pi) * twist
        center_x = base_x + outward_x * curve + side_x * sway
        center_y = base_y + outward_y * curve + side_y * sway
        center_x += side_x * side_fan
        center_y += side_y * side_fan
        center_z = height * t - droop

        vertices.extend([
            (center_x - side_x * w, center_y - side_y * w, center_z),
            (center_x + side_x * w, center_y + side_y * w, center_z),
        ])

    for i in range(segments):
        a = root + i * 2
        faces.append((a, a + 1, a + 3, a + 2))

    tip_base = root + segments * 2
    tip_x = (vertices[tip_base][0] + vertices[tip_base + 1][0]) * 0.5 + outward_x * width * 0.7 + side_x * fan * 0.22
    tip_y = (vertices[tip_base][1] + vertices[tip_base + 1][1]) * 0.5 + outward_y * width * 0.7 + side_y * fan * 0.22
    tip_z = max(vertices[tip_base][2], vertices[tip_base + 1][2]) + height * 0.035
    vertices.append((tip_x, tip_y, tip_z))
    faces.append((tip_base, tip_base + 1, len(vertices) - 1))


def mix_color(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


def add_vertex_colors(mesh, palette):
    color_attr = mesh.color_attributes.new(name="grass_color", type="BYTE_COLOR", domain="CORNER")
    min_z = min(v.co.z for v in mesh.vertices)
    max_z = max(v.co.z for v in mesh.vertices)
    height = max(max_z - min_z, 0.001)
    root_color = palette["root"]
    mid_color = palette["mid"]
    lit_color = palette["lit"]
    tip_color = palette["tip"]
    shadow_color = palette["shadow"]

    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            z = mesh.vertices[vertex_index].co.z
            t = max(0.0, min(1.0, (z - min_z) / height))
            if t < 0.62:
                color = mix_color(root_color, mid_color, t / 0.62)
            else:
                upper_t = (t - 0.62) / 0.38
                color = mix_color(lit_color, tip_color, upper_t)

            blade_side_shadow = 0.5 + 0.5 * math.sin(vertex_index * 4.113 + poly.index * 1.731)
            shadow_mix = 0.18 + blade_side_shadow * 0.28
            color = mix_color(color, shadow_color, shadow_mix)

            blade_highlight = max(0.0, math.sin(vertex_index * 7.271 + poly.index * 0.619))
            if 0.24 < t < 0.86:
                color = mix_color(color, lit_color, blade_highlight * 0.045)

            shade = 0.78 + math.sin(vertex_index * 12.9898 + poly.index * 0.37) * 0.07
            color_attr.data[loop_index].color = (
                max(0.0, min(1.0, color[0] * shade)),
                max(0.0, min(1.0, color[1] * shade)),
                max(0.0, min(1.0, color[2] * shade)),
                1.0,
            )

    mesh.color_attributes.active_color = color_attr


def build_grass_clump(variant):
    vertices = []
    faces = []
    blade_count = variant["blade_count"]
    for i in range(blade_count):
        t = i / blade_count
        angle = t * math.tau + math.sin(i * 1.83) * 0.14
        radius = 0.006 + (i % 4) * 0.005
        height = variant["height_base"] + (i % variant["height_cycle"]) * variant["height_step"]
        width = variant["width_base"] + (i % variant["width_cycle"]) * variant["width_step"]
        bend = variant["bend_base"] + (i % variant["bend_cycle"]) * variant["bend_step"]
        fan_side = -1 if i % 2 == 0 else 1
        fan = fan_side * (variant["fan_base"] + (i % variant["fan_cycle"]) * variant["fan_step"])
        if i % 7 == 0:
            fan *= 0.35
        add_blade(
            vertices,
            faces,
            angle,
            radius,
            height,
            width,
            bend,
            fan,
            variant["droop"],
            variant.get("blade_segments", 7),
        )

    mesh = bpy.data.meshes.new(f"{variant['name']}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_vertex_colors(mesh, variant["palette"])
    mesh.materials.append(make_material(variant))

    obj = bpy.data.objects.new(variant["name"], mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj


def export_glb(obj, out_path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )


def parse_args():
    argv = sys.argv
    script_args = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", action="append", help="Export only the named grass variant.")
    return parser.parse_args(script_args)


def main():
    args = parse_args()
    selected_names = set(args.variant) if args.variant else {variant["name"] for variant in GRASS_VARIANTS}
    known_names = {variant["name"] for variant in GRASS_VARIANTS}
    unknown_names = selected_names - known_names
    if unknown_names:
        raise ValueError(f"Unknown grass variant(s): {', '.join(sorted(unknown_names))}")

    for variant in GRASS_VARIANTS:
        if variant["name"] not in selected_names:
            continue
        reset_scene()
        obj = build_grass_clump(variant)
        mesh = obj.data
        tri_count = sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons)
        export_glb(obj, variant["out_path"])
        print(f"Exported {variant['out_path']} (verts={len(mesh.vertices)}, tris={tri_count})")


if __name__ == "__main__":
    main()
