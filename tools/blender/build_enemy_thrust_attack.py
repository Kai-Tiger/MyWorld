import math
from pathlib import Path

import bpy


ROOT = Path.cwd()
SOURCE_FBX = ROOT / "src" / "characters" / "enemy" / "main.fbx"
OUT_FBX = ROOT / "src" / "characters" / "enemy" / "thrust_attack.fbx"

ACTION_NAME = "enemy_thrust_attack"
FPS = 30
FRAME_START = 1
FRAME_END = 26


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.armatures,
        bpy.data.actions,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.textures,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def import_source_armature():
    if not SOURCE_FBX.exists():
        raise FileNotFoundError(SOURCE_FBX)

    bpy.ops.import_scene.fbx(filepath=str(SOURCE_FBX))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError(f"No armature found in {SOURCE_FBX}")

    armature = armatures[0]
    for obj in list(bpy.context.scene.objects):
        if obj != armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    return armature


def capture_base_pose(armature):
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()

    base = {}
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        base[bone.name] = {
            "location": bone.location.copy(),
            "rotation": bone.rotation_euler.copy(),
            "scale": bone.scale.copy(),
        }
    return base


def clear_source_animation(armature):
    for obj in bpy.context.scene.objects:
        obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    armature.animation_data_create()


def pose_bone(armature, name):
    bone = armature.pose.bones.get(name)
    if bone:
        bone.rotation_mode = "XYZ"
    return bone


def apply_base_pose(armature, base):
    for bone in armature.pose.bones:
        source = base[bone.name]
        bone.rotation_mode = "XYZ"
        bone.location = source["location"].copy()
        bone.rotation_euler = source["rotation"].copy()
        bone.scale = source["scale"].copy()


def add_rotation(armature, bone_name, x=0.0, y=0.0, z=0.0):
    bone = pose_bone(armature, bone_name)
    if not bone:
        return
    bone.rotation_euler.x += math.radians(x)
    bone.rotation_euler.y += math.radians(y)
    bone.rotation_euler.z += math.radians(z)


def add_location(armature, bone_name, x=0.0, y=0.0, z=0.0):
    bone = pose_bone(armature, bone_name)
    if not bone:
        return
    bone.location.x += x
    bone.location.y += y
    bone.location.z += z


def apply_thrust_pose(armature, strength):
    add_location(armature, "mixamorig:Hips", z=-0.012 * strength)
    add_rotation(armature, "mixamorig:Hips", x=5 * strength, y=-4 * strength, z=7 * strength)
    add_rotation(armature, "mixamorig:Spine", x=10 * strength, y=-5 * strength, z=7 * strength)
    add_rotation(armature, "mixamorig:Spine1", x=13 * strength, y=-7 * strength, z=8 * strength)
    add_rotation(armature, "mixamorig:Spine2", x=15 * strength, y=-8 * strength, z=6 * strength)
    add_rotation(armature, "mixamorig:Neck", x=-4 * strength, y=0, z=-3 * strength)
    add_rotation(armature, "mixamorig:Head", x=-6 * strength, y=0, z=-4 * strength)

    add_rotation(armature, "mixamorig:RightShoulder", x=6 * strength, y=-8 * strength, z=-8 * strength)
    add_rotation(armature, "mixamorig:RightArm", x=62 * strength, y=-12 * strength, z=-18 * strength)
    add_rotation(armature, "mixamorig:RightForeArm", x=18 * strength, y=2 * strength, z=-8 * strength)
    add_rotation(armature, "mixamorig:RightHand", x=8 * strength, y=0, z=-5 * strength)

    add_rotation(armature, "mixamorig:LeftShoulder", x=-5 * strength, y=6 * strength, z=8 * strength)
    add_rotation(armature, "mixamorig:LeftArm", x=-22 * strength, y=18 * strength, z=28 * strength)
    add_rotation(armature, "mixamorig:LeftForeArm", x=-24 * strength, y=-2 * strength, z=-14 * strength)

    add_rotation(armature, "mixamorig:LeftUpLeg", x=-10 * strength, y=2 * strength, z=-5 * strength)
    add_rotation(armature, "mixamorig:LeftLeg", x=11 * strength, y=0, z=0)
    add_rotation(armature, "mixamorig:LeftFoot", x=-8 * strength, y=0, z=2 * strength)
    add_rotation(armature, "mixamorig:RightUpLeg", x=14 * strength, y=-2 * strength, z=5 * strength)
    add_rotation(armature, "mixamorig:RightLeg", x=-12 * strength, y=0, z=0)
    add_rotation(armature, "mixamorig:RightFoot", x=7 * strength, y=0, z=-2 * strength)


def apply_windup_pose(armature, strength):
    add_location(armature, "mixamorig:Hips", z=-0.008 * strength)
    add_rotation(armature, "mixamorig:Hips", x=-5 * strength, y=5 * strength, z=-9 * strength)
    add_rotation(armature, "mixamorig:Spine", x=-8 * strength, y=5 * strength, z=-8 * strength)
    add_rotation(armature, "mixamorig:Spine1", x=-12 * strength, y=6 * strength, z=-10 * strength)
    add_rotation(armature, "mixamorig:Spine2", x=-15 * strength, y=7 * strength, z=-8 * strength)
    add_rotation(armature, "mixamorig:Neck", x=5 * strength, y=0, z=4 * strength)
    add_rotation(armature, "mixamorig:Head", x=6 * strength, y=0, z=5 * strength)

    add_rotation(armature, "mixamorig:RightShoulder", x=-4 * strength, y=8 * strength, z=8 * strength)
    add_rotation(armature, "mixamorig:RightArm", x=-42 * strength, y=18 * strength, z=-32 * strength)
    add_rotation(armature, "mixamorig:RightForeArm", x=-58 * strength, y=-6 * strength, z=16 * strength)
    add_rotation(armature, "mixamorig:RightHand", x=-8 * strength, y=0, z=8 * strength)

    add_rotation(armature, "mixamorig:LeftArm", x=-10 * strength, y=-15 * strength, z=28 * strength)
    add_rotation(armature, "mixamorig:LeftForeArm", x=-34 * strength, y=0, z=-8 * strength)

    add_rotation(armature, "mixamorig:LeftUpLeg", x=8 * strength, y=0, z=4 * strength)
    add_rotation(armature, "mixamorig:LeftLeg", x=-8 * strength, y=0, z=0)
    add_rotation(armature, "mixamorig:RightUpLeg", x=-9 * strength, y=0, z=-4 * strength)
    add_rotation(armature, "mixamorig:RightLeg", x=10 * strength, y=0, z=0)


def key_all_bones(armature, frame):
    for bone in armature.pose.bones:
        bone.keyframe_insert(data_path="location", frame=frame)
        bone.keyframe_insert(data_path="rotation_euler", frame=frame)
        bone.keyframe_insert(data_path="scale", frame=frame)


def iter_action_fcurves(action):
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for channelbag in getattr(strip, "channelbags", []):
                yield from channelbag.fcurves


def smooth_action(action):
    for curve in iter_action_fcurves(action):
        for key in curve.keyframe_points:
            key.interpolation = "BEZIER"


def build_animation(armature, base):
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END

    keys = [
        (1, "base", 0.0),
        (5, "windup", 0.55),
        (8, "windup", 1.0),
        (13, "thrust", 1.0),
        (16, "thrust", 0.82),
        (21, "windup", 0.28),
        (26, "base", 0.0),
    ]

    for frame, pose_type, strength in keys:
        bpy.context.scene.frame_set(frame)
        apply_base_pose(armature, base)
        if pose_type == "windup":
            apply_windup_pose(armature, strength)
        elif pose_type == "thrust":
            apply_thrust_pose(armature, strength)
        bpy.context.view_layer.update()
        key_all_bones(armature, frame)

    action = armature.animation_data.action
    if not action:
        raise RuntimeError("No action was created")
    action.name = ACTION_NAME
    smooth_action(action)
    return action


def export_fbx(armature):
    OUT_FBX.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.fbx(
        filepath=str(OUT_FBX),
        use_selection=True,
        object_types={"ARMATURE"},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        bake_anim_simplify_factor=0.0,
        bake_anim_step=1.0,
    )


def main():
    reset_scene()
    armature = import_source_armature()
    base = capture_base_pose(armature)
    clear_source_animation(armature)
    action = build_animation(armature, base)
    export_fbx(armature)
    curve_count = sum(1 for _ in iter_action_fcurves(action))
    print(f"Exported {OUT_FBX}")
    print(f"Action {action.name}: frames {tuple(action.frame_range)}, curves {curve_count}")


if __name__ == "__main__":
    main()
