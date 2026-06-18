import json
import math
import re
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "src/place/old_church_ruins.glb"
OUTPUT = ROOT / "src/place/old_church_ruins_colliders.json"

COLLIDER_NAME_RE = re.compile(r"(RUINED_WALL|SMALL_RUINED_WALL|TOWER_FACADE|FACADE|PILLAR|Pillar)")
SKIP_NAME_RE = re.compile(r"(STONES|PAVEMENT|LONE_STONE|ARCH|GATE)")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def collider_from_object(obj):
    world = obj.matrix_world
    corners = [world @ Vector(corner) for corner in obj.bound_box]
    game_corners = [Vector((corner.x, corner.z, -corner.y)) for corner in corners]
    center = sum(game_corners, Vector()) / 8

    points = [Vector((corner.x - center.x, corner.z - center.z)) for corner in game_corners]
    cov_xx = sum(point.x * point.x for point in points) / len(points)
    cov_zz = sum(point.y * point.y for point in points) / len(points)
    cov_xz = sum(point.x * point.y for point in points) / len(points)
    angle = 0.5 * math.atan2(2 * cov_xz, cov_xx - cov_zz)
    x_axis = Vector((math.cos(angle), math.sin(angle)))
    z_axis = Vector((-math.sin(angle), math.cos(angle)))

    hx = max(abs(point.dot(x_axis)) for point in points)
    hz = max(abs(point.dot(z_axis)) for point in points)
    height = max(corner.y for corner in game_corners) - min(corner.y for corner in game_corners)
    if height < 0.8 or max(hx, hz) < 0.18:
        return None

    # Keep boxes long and thin when possible. Very square facade bounds tend to
    # block openings, so they are left to wall/pillar colliders.
    aspect = max(hx, hz) / max(0.001, min(hx, hz))
    if max(hx, hz) > 3.0 and min(hx, hz) > 1.8 and aspect < 3.0:
        return None

    return {
        "name": obj.name,
        "x": round(center.x, 4),
        "z": round(center.z, 4),
        "hx": round(max(0.08, hx - 0.08), 4),
        "hz": round(max(0.08, hz - 0.08), 4),
        "ux": round(x_axis.x, 6),
        "uz": round(x_axis.y, 6),
        "vx": round(z_axis.x, 6),
        "vz": round(z_axis.y, 6),
        "minY": round(min(corner.y for corner in game_corners) - 0.2, 4),
        "maxY": round(max(corner.y for corner in game_corners) + 0.2, 4),
    }


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(INPUT))
    bpy.context.view_layer.update()

    colliders = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        internal_name = f"{obj.name} {obj.data.name}"
        if not COLLIDER_NAME_RE.search(internal_name):
            continue
        if SKIP_NAME_RE.search(internal_name):
            continue
        collider = collider_from_object(obj)
        if collider:
            colliders.append(collider)

    colliders.sort(key=lambda c: c["name"])
    OUTPUT.write_text(json.dumps(colliders, indent=2), encoding="utf-8")
    print(json.dumps({
        "input": str(INPUT.relative_to(ROOT)),
        "output": str(OUTPUT.relative_to(ROOT)),
        "colliders": len(colliders),
    }, indent=2))


if __name__ == "__main__":
    main()
