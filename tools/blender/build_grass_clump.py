from pathlib import Path
import math

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = ROOT / "public" / "models" / "grass" / "grass_clump_low.glb"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material():
    mat = bpy.data.materials.new("grass_clump_low_mat")
    mat.diffuse_color = (0.105, 0.155, 0.065, 1.0)
    mat.use_nodes = True
    mat.use_backface_culling = False
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.105, 0.155, 0.065, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.92

        vertex_color = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vertex_color.layer_name = "grass_color"
        mat.node_tree.links.new(vertex_color.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def add_blade(vertices, faces, angle, radius, height, width, bend, fan):
    base_x = math.cos(angle) * radius
    base_y = math.sin(angle) * radius
    side_x = math.cos(angle + math.pi * 0.5)
    side_y = math.sin(angle + math.pi * 0.5)
    outward_x = math.cos(angle)
    outward_y = math.sin(angle)
    twist = math.sin(angle * 2.7) * 0.014

    root = len(vertices)
    segments = 7
    for i in range(segments + 1):
        t = i / segments
        taper = (1 - t) ** 1.25
        w = width * taper
        curve = (1 - math.cos(t * math.pi * 0.78)) * bend
        side_fan = math.sin(t * math.pi * 0.72) * fan
        droop = max(0, t - 0.58) ** 2 * height * 0.55
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


def add_vertex_colors(mesh):
    color_attr = mesh.color_attributes.new(name="grass_color", type="BYTE_COLOR", domain="CORNER")
    min_z = min(v.co.z for v in mesh.vertices)
    max_z = max(v.co.z for v in mesh.vertices)
    height = max(max_z - min_z, 0.001)
    root_color = (0.0315, 0.054, 0.0225, 1.0)
    mid_color = (0.0945, 0.153, 0.063, 1.0)
    lit_color = (0.1125, 0.1845, 0.063, 1.0)
    tip_color = (0.1305, 0.1845, 0.0675, 1.0)
    shadow_color = (0.018, 0.036, 0.018, 1.0)

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


def build_grass_clump():
    vertices = []
    faces = []
    blade_count = 21
    for i in range(blade_count):
        t = i / blade_count
        angle = t * math.tau + math.sin(i * 1.83) * 0.14
        radius = 0.006 + (i % 4) * 0.005
        height = 0.72 + (i % 5) * 0.045
        width = 0.024 + (i % 4) * 0.004
        bend = 0.16 + (i % 6) * 0.028
        fan_side = -1 if i % 2 == 0 else 1
        fan = fan_side * (0.055 + (i % 5) * 0.011)
        if i % 7 == 0:
            fan *= 0.35
        add_blade(vertices, faces, angle, radius, height, width, bend, fan)

    mesh = bpy.data.meshes.new("grass_clump_low_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    add_vertex_colors(mesh)
    mesh.materials.append(make_material())

    obj = bpy.data.objects.new("grass_clump_low", mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj


def export_glb(obj):
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )


def main():
    reset_scene()
    obj = build_grass_clump()
    export_glb(obj)
    print(f"Exported {OUT_PATH}")


if __name__ == "__main__":
    main()
