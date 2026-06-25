import json
import math
import struct
import sys
import zlib
from pathlib import Path

import numpy as np


bpy = None
Vector = None


ROOT = Path(__file__).resolve().parents[2]
HEIGHTMAP_PATH = ROOT / "public" / "heightmaps" / "large_alpine_height_4096.png"
METADATA_PATH = ROOT / "public" / "heightmaps" / "large_alpine_height_4096.json"
OUTPUT_BLEND = ROOT / "assets" / "blender" / "large_alpine_terrain.blend"
OUTPUT_PREVIEW = ROOT / "previews" / "large_alpine_terrain.png"

HEIGHTMAP_RESOLUTION = 4096
WORLD_SIZE = 2048.0
PREVIEW_GRID = 513
HEIGHT_MIN = -34.0
HEIGHT_MAX = 238.0
HEIGHT_RANGE = HEIGHT_MAX - HEIGHT_MIN


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gaussian(x, z, cx, cz, sx, sz, height):
    return height * np.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))


def ridge_noise(x, z):
    broad = (
        np.sin(x * 0.005 + z * 0.003) * 0.46
        + np.sin(x * 0.011 - z * 0.007 + 1.7) * 0.28
        + np.cos(x * 0.019 + z * 0.013 - 0.9) * 0.15
    )
    fine = (
        np.sin(x * 0.047 + z * 0.031) * 0.07
        + np.cos(x * 0.083 - z * 0.052) * 0.035
    )
    return broad + fine


def river_center(z):
    return (
        42.0 * np.sin(z * 0.0047 + 0.4)
        + 24.0 * np.sin(z * 0.0105 - 1.1)
        - 55.0 * smoothstep(-1024.0, 1024.0, z)
    )


def terrain_height_field(resolution):
    axis = np.linspace(-WORLD_SIZE * 0.5, WORLD_SIZE * 0.5, resolution, dtype=np.float32)
    x = axis[None, :]
    z = axis[:, None]

    height = np.zeros((resolution, resolution), dtype=np.float32)
    height += 20.0
    height += 13.0 * ridge_noise(x, z)

    north = smoothstep(-160.0, 1010.0, z)
    height += north * (34.0 + 22.0 * ridge_noise(x * 0.7, z * 0.8))

    height += gaussian(x, z, -680.0, 760.0, 210.0, 330.0, 106.0)
    height += gaussian(x, z, -360.0, 900.0, 190.0, 280.0, 158.0)
    height += gaussian(x, z, 70.0, 845.0, 250.0, 315.0, 128.0)
    height += gaussian(x, z, 470.0, 870.0, 220.0, 300.0, 148.0)
    height += gaussian(x, z, 830.0, 760.0, 205.0, 270.0, 112.0)

    height += gaussian(x, z, -930.0, 95.0, 180.0, 740.0, 62.0)
    height += gaussian(x, z, 950.0, -80.0, 210.0, 790.0, 56.0)
    height += gaussian(x, z, -720.0, -620.0, 230.0, 250.0, 44.0)

    center = river_center(z)
    river_dist = np.abs(x - center)
    valley_width = 185.0 + 72.0 * np.sin(z * 0.0027 + 1.3)
    broad_valley = 1.0 - smoothstep(valley_width * 0.62, valley_width, river_dist)
    inner_channel = 1.0 - smoothstep(13.0, 38.0, river_dist)
    height -= broad_valley * (31.0 + 14.0 * smoothstep(-520.0, 760.0, z))
    height -= inner_channel * 9.5

    lake_a = ((x - 50.0) / 145.0) ** 2 + ((z - 55.0) / 74.0) ** 2
    lake_b = ((x + 72.0) / 112.0) ** 2 + ((z + 185.0) / 58.0) ** 2
    lake_mask = np.maximum(1.0 - smoothstep(0.72, 1.15, lake_a), 1.0 - smoothstep(0.72, 1.16, lake_b))
    lake_floor = -7.0 + 2.2 * ridge_noise(x * 1.2, z * 1.2)
    height = height * (1.0 - lake_mask * 0.72) + lake_floor * (lake_mask * 0.72)

    tributary_west = np.abs((x + 430.0) - np.sin(z * 0.006) * 45.0)
    tributary_east = np.abs((x - 520.0) + np.sin(z * 0.005 + 1.8) * 55.0)
    height -= (1.0 - smoothstep(18.0, 54.0, tributary_west)) * smoothstep(-780.0, 420.0, z) * 5.5
    height -= (1.0 - smoothstep(20.0, 62.0, tributary_east)) * smoothstep(-650.0, 590.0, z) * 5.0

    erosion = ridge_noise(x * 2.3 + 180.0, z * 2.2 - 90.0)
    height += erosion * (3.6 + north * 4.2)

    edge_drop = smoothstep(900.0, 1024.0, np.maximum(np.abs(x), np.abs(z)))
    height -= edge_drop * 11.0

    return np.clip(height, HEIGHT_MIN, HEIGHT_MAX)


def write_png16_grayscale(path, values_u16):
    path.parent.mkdir(parents=True, exist_ok=True)
    height, width = values_u16.shape
    rows = []
    be_values = values_u16.astype(">u2", copy=False)
    for row in be_values:
        rows.append(b"\x00" + row.tobytes())
    raw = b"".join(rows)

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 16, 0, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, level=6))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def make_mat(name, color, roughness=0.9, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    return mat


def build_terrain_mesh(height):
    mats = {
        "grass": make_mat("alpine valley grass", (0.24, 0.40, 0.18, 1.0), 0.92),
        "dry": make_mat("pale exposed earth", (0.54, 0.50, 0.40, 1.0), 0.96),
        "rock": make_mat("cold grey mountain rock", (0.55, 0.58, 0.57, 1.0), 0.98),
        "snow": make_mat("wind packed snow", (0.94, 0.95, 0.92, 1.0), 0.82),
        "wet": make_mat("dark wet river soil", (0.16, 0.13, 0.09, 1.0), 1.0),
    }

    sample = np.linspace(0, height.shape[0] - 1, PREVIEW_GRID).round().astype(np.int32)
    sampled = height[np.ix_(sample, sample)]
    step = WORLD_SIZE / (PREVIEW_GRID - 1)
    half = WORLD_SIZE * 0.5
    verts = []
    for iz in range(PREVIEW_GRID):
        z = -half + iz * step
        for ix in range(PREVIEW_GRID):
            x = -half + ix * step
            verts.append((x, float(sampled[iz, ix]), z))

    faces = []
    for iz in range(PREVIEW_GRID - 1):
        row = iz * PREVIEW_GRID
        next_row = (iz + 1) * PREVIEW_GRID
        for ix in range(PREVIEW_GRID - 1):
            faces.append((row + ix, row + ix + 1, next_row + ix + 1, next_row + ix))

    mesh = bpy.data.meshes.new("large_alpine_heightmap_preview_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    obj = bpy.data.objects.new("TERRAIN_HEIGHTMAP_SOURCE", mesh)
    bpy.context.collection.objects.link(obj)
    for mat in mats.values():
        obj.data.materials.append(mat)

    normals = mesh.polygons
    for poly in normals:
        avg_h = sum(mesh.vertices[loop.vertex_index].co.y for loop in [mesh.loops[i] for i in poly.loop_indices]) / len(poly.loop_indices)
        slope = 1.0 - abs(poly.normal.y)
        if avg_h < -3.5:
            poly.material_index = 4
        elif avg_h > 106.0 and slope < 0.64:
            poly.material_index = 3
        elif slope > 0.42 or avg_h > 72.0:
            poly.material_index = 2
        elif avg_h < 18.0 and slope < 0.22:
            poly.material_index = 0
        else:
            poly.material_index = 1

    obj["heightmap_path"] = str(HEIGHTMAP_PATH.relative_to(ROOT))
    obj["heightmap_resolution"] = HEIGHTMAP_RESOLUTION
    obj["world_size_meters"] = WORLD_SIZE
    obj["height_min"] = HEIGHT_MIN
    obj["height_max"] = HEIGHT_MAX
    obj["preview_grid"] = PREVIEW_GRID

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.modifiers.new("terrain_weighted_normals", "WEIGHTED_NORMAL")
    obj.select_set(False)
    return obj


def sample_height_nearest(height, x, z):
    u = (x / WORLD_SIZE + 0.5) * (height.shape[1] - 1)
    v = (z / WORLD_SIZE + 0.5) * (height.shape[0] - 1)
    ix = int(np.clip(round(u), 0, height.shape[1] - 1))
    iz = int(np.clip(round(v), 0, height.shape[0] - 1))
    return float(height[iz, ix])


def make_water_material():
    mat = make_mat("clear cold alpine water", (0.22, 0.52, 0.70, 0.62), 0.34, alpha=0.62)
    return mat


def add_water(height):
    mat = make_water_material()
    river_points = []
    for i in range(96):
        z = -860.0 + i * (1710.0 / 95.0)
        x = float(river_center(np.array([[z]], dtype=np.float32))[0, 0])
        w = 11.0 + 5.0 * math.sin(i * 0.21)
        y = max(-4.0, sample_height_nearest(height, x, z) + 0.85)
        river_points.append((x, z, w, y))

    verts = []
    faces = []
    for x, z, width, y in river_points:
        verts.append((x - width, y, z))
        verts.append((x + width, y, z))
    for i in range(len(river_points) - 1):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))

    mesh = bpy.data.meshes.new("water_central_river_preview_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("WATER_PREVIEW_central_river", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)

    for name, cx, cz, rx, rz, y in [
        ("WATER_PREVIEW_north_lake", 50.0, 55.0, 150.0, 80.0, -2.2),
        ("WATER_PREVIEW_south_lake", -72.0, -185.0, 116.0, 62.0, -2.6),
    ]:
        verts = [(cx, y, cz)]
        faces = []
        for i in range(96):
            a = math.tau * i / 96.0
            verts.append((cx + math.cos(a) * rx, y, cz + math.sin(a) * rz))
        for i in range(96):
            faces.append((0, i + 1, 1 + ((i + 1) % 96)))
        mesh = bpy.data.meshes.new(f"{name}_mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        lake = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(lake)
        lake.data.materials.append(mat)


def create_cone_mesh(name, radius, height, segments):
    verts = [(0.0, height, 0.0), (0.0, 0.0, 0.0)]
    for i in range(segments):
        a = math.tau * i / segments
        verts.append((math.cos(a) * radius, 0.0, math.sin(a) * radius))
    faces = []
    for i in range(segments):
        faces.append((0, 2 + i, 2 + ((i + 1) % segments)))
        faces.append((1, 2 + ((i + 1) % segments), 2 + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    return mesh


def add_forest_proxies(height):
    forest_coll = bpy.data.collections.new("FOREST_PROXY")
    bpy.context.scene.collection.children.link(forest_coll)
    canopy_mat = make_mat("forest proxy dark conifer", (0.055, 0.16, 0.095, 1.0), 0.88)
    canopy_mesh = create_cone_mesh("forest_proxy_conifer_canopy_mesh", 2.8, 9.0, 7)
    rng = np.random.default_rng(42)
    count = 900
    placed = 0
    for i in range(count * 3):
        if placed >= count:
            break
        x = float(rng.uniform(-930.0, 930.0))
        z = float(rng.uniform(-760.0, 520.0))
        center = float(river_center(np.array([[z]], dtype=np.float32))[0, 0])
        if abs(x - center) < 72.0:
            continue
        y = sample_height_nearest(height, x, z)
        if y < -4.0 or y > 86.0:
            continue
        scale = float(rng.uniform(0.75, 1.45))
        obj = bpy.data.objects.new(f"FOREST_PROXY_tree_{placed:04d}", canopy_mesh)
        obj.location = (x, y, z)
        obj.rotation_euler = (0.0, float(rng.uniform(0.0, math.tau)), 0.0)
        obj.scale = (scale, scale, scale)
        obj.data.materials.append(canopy_mat) if not obj.data.materials else None
        forest_coll.objects.link(obj)
        placed += 1


def add_lighting_and_camera():
    bpy.ops.object.light_add(type="SUN", location=(-420, 820, -510), rotation=(math.radians(43), 0, math.radians(-32)))
    sun = bpy.context.object
    sun.name = "SUN_PREVIEW_cold_morning"
    sun.data.energy = 4.2
    sun.data.angle = math.radians(6.0)

    bpy.ops.object.light_add(type="AREA", location=(0, 540, -180), rotation=(math.radians(70), 0, 0))
    fill = bpy.context.object
    fill.name = "AREA_PREVIEW_sky_fill"
    fill.data.energy = 1600
    fill.data.size = 1400

    bpy.context.scene.world = bpy.data.worlds.new("large_alpine_preview_world")
    bpy.context.scene.world.color = (0.62, 0.74, 0.84)

    bpy.ops.object.camera_add(location=(0.0, 560.0, -1520.0))
    cam = bpy.context.object
    cam.name = "CAMERA_PREVIEW"
    target = Vector((0.0, 58.0, 220.0))
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 26
    cam.data.clip_end = 5000
    cam.data.dof.use_dof = False
    cam.data.dof.focus_distance = direction.length
    bpy.context.scene.camera = cam


def setup_render():
    try:
        bpy.context.scene.render.engine = "BLENDER_WORKBENCH"
        bpy.context.scene.display.shading.light = "STUDIO"
        bpy.context.scene.display.shading.color_type = "MATERIAL"
        bpy.context.scene.display.shading.show_cavity = True
    except TypeError:
        bpy.context.scene.render.engine = "CYCLES"
        bpy.context.scene.cycles.samples = 48
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.view_settings.look = "None"
    bpy.context.scene.view_settings.exposure = 0.2
    bpy.context.scene.view_settings.gamma = 1.0
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 950


def write_metadata():
    METADATA_PATH.write_text(
        json.dumps(
            {
                "heightmap": str(HEIGHTMAP_PATH.relative_to(ROOT)),
                "resolution": HEIGHTMAP_RESOLUTION,
                "format": "16-bit grayscale PNG",
                "worldSizeMeters": WORLD_SIZE,
                "heightMin": HEIGHT_MIN,
                "heightMax": HEIGHT_MAX,
                "metersPerPixel": WORLD_SIZE / HEIGHTMAP_RESOLUTION,
                "blend": str(OUTPUT_BLEND.relative_to(ROOT)),
                "preview": str(OUTPUT_PREVIEW.relative_to(ROOT)),
            },
            indent=2,
        )
        + "\n"
    )


def main():
    global bpy, Vector
    heightmap_only = "--heightmap-only" in sys.argv
    scene_only = "--scene-only" in sys.argv

    if heightmap_only and scene_only:
        raise SystemExit("Use either --heightmap-only or --scene-only, not both.")

    if heightmap_only:
        HEIGHTMAP_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
        print("Generating 4096 height field...", flush=True)
        height = terrain_height_field(HEIGHTMAP_RESOLUTION)
        normalized = np.clip((height - HEIGHT_MIN) / HEIGHT_RANGE, 0.0, 1.0)
        values_u16 = np.round(normalized * 65535.0).astype(np.uint16)
        write_png16_grayscale(HEIGHTMAP_PATH, values_u16)
        write_metadata()
        print(f"Wrote {HEIGHTMAP_PATH}", flush=True)
        print(f"Wrote {METADATA_PATH}", flush=True)
        return

    import bpy as _bpy
    from mathutils import Vector as _Vector

    bpy = _bpy
    Vector = _Vector

    if not HEIGHTMAP_PATH.exists():
        raise SystemExit(f"Missing {HEIGHTMAP_PATH}. Run with --heightmap-only first.")

    clear_scene()
    HEIGHTMAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    print("Building Blender preview terrain...", flush=True)
    height = terrain_height_field(PREVIEW_GRID)
    terrain = build_terrain_mesh(height)
    img = bpy.data.images.load(str(HEIGHTMAP_PATH), check_existing=True)
    img.name = "large_alpine_height_4096_source"
    terrain["source_image_name"] = img.name

    add_water(height)
    add_forest_proxies(height)
    add_lighting_and_camera()
    setup_render()

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.context.scene.render.filepath = str(OUTPUT_PREVIEW)
    bpy.ops.render.render(write_still=True)
    write_metadata()
    print(f"Wrote {OUTPUT_BLEND}", flush=True)
    print(f"Wrote {OUTPUT_PREVIEW}", flush=True)


if __name__ == "__main__":
    main()
