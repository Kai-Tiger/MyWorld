import math
from pathlib import Path

import bpy
from mathutils import Euler


ROOT = Path.cwd()
SOURCE_FBX = ROOT / "src" / "characters" / "enemy" / "main.fbx"
RUN_FBX = ROOT / "src" / "characters" / "enemy" / "run.fbx"
OUT_FBX = ROOT / "src" / "characters" / "enemy" / "cross_guard.fbx"

ACTION_NAME = "enemy_cross_guard"
FPS = 30
FRAME_START = 1
FRAME_END = 20
RUN_LOWER_BODY_BONES = [
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:LeftToeBase",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
    "mixamorig:RightToeBase",
]


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


def import_run_armature():
    if not RUN_FBX.exists():
        raise FileNotFoundError(RUN_FBX)

    bpy.ops.import_scene.fbx(filepath=str(RUN_FBX))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) < 2:
        raise RuntimeError(f"No run source armature found in {RUN_FBX}")

    source = armatures[-1]
    source.name = "RunSourceArmature"
    return source


def clear_source_animation(armature):
    for obj in bpy.context.scene.objects:
        obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    armature.animation_data_create()


def pose_bone(armature, name):
    bone = armature.pose.bones.get(name)
    if bone:
        bone.rotation_mode = "QUATERNION"
    return bone


def add_rotation(armature, bone_name, x=0.0, y=0.0, z=0.0):
    bone = pose_bone(armature, bone_name)
    if not bone:
        return
    delta = Euler((math.radians(x), math.radians(y), math.radians(z)), "XYZ").to_quaternion()
    bone.rotation_quaternion = bone.rotation_quaternion @ delta


def use_quaternion_rotation(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"


def copy_pose(source, target):
    for target_bone in target.pose.bones:
        source_bone = source.pose.bones.get(target_bone.name)
        if source_bone:
            source_bone.rotation_mode = "QUATERNION"
            target_bone.rotation_mode = "QUATERNION"
            target_bone.location = source_bone.location.copy()
            target_bone.rotation_quaternion = source_bone.rotation_quaternion.copy()
            target_bone.scale = source_bone.scale.copy()


def apply_guard_body_pose(armature, strength, settle=0.0):
    crouch = strength * (1.0 - settle * 0.08)

    add_rotation(armature, "mixamorig:Hips", x=3 * crouch)
    add_rotation(armature, "mixamorig:Spine", x=8 * crouch)
    add_rotation(armature, "mixamorig:Spine1", x=12 * crouch)
    add_rotation(armature, "mixamorig:Spine2", x=14 * crouch)
    add_rotation(armature, "mixamorig:Neck", x=-5 * strength)
    add_rotation(armature, "mixamorig:Head", x=-9 * strength)


def create_ik_target(name):
    target = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(target)
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.08
    return target


def add_hand_ik(armature, side, target):
    hand = armature.pose.bones[f"mixamorig:{side}Hand"]
    constraint = hand.constraints.new(type="IK")
    constraint.name = f"{side}GuardIK"
    constraint.target = target
    constraint.chain_count = 3
    constraint.use_rotation = True
    constraint.influence = 0
    return constraint


def key_all_bones(armature, frame):
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.keyframe_insert(data_path="location", frame=frame)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
        bone.keyframe_insert(data_path="scale", frame=frame)


def key_target(target, frame):
    target.keyframe_insert(data_path="location", frame=frame)


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


def set_smooth_interpolation_for_all_actions():
    for action in bpy.data.actions:
        smooth_action(action)


def restore_run_lower_body(armature, run_armature):
    for frame in range(FRAME_START, FRAME_END + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for bone_name in RUN_LOWER_BODY_BONES:
            source_bone = run_armature.pose.bones.get(bone_name)
            target_bone = armature.pose.bones.get(bone_name)
            if not source_bone or not target_bone:
                continue
            source_bone.rotation_mode = "QUATERNION"
            target_bone.rotation_mode = "QUATERNION"
            target_bone.location = source_bone.location.copy()
            target_bone.rotation_quaternion = source_bone.rotation_quaternion.copy()
            target_bone.scale = source_bone.scale.copy()
            target_bone.keyframe_insert(data_path="location", frame=frame)
            target_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
            target_bone.keyframe_insert(data_path="scale", frame=frame)


def build_animation(armature, run_armature):
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END
    use_quaternion_rotation(armature)
    use_quaternion_rotation(run_armature)

    left_target = create_ik_target("LeftGuardIKTarget")
    right_target = create_ik_target("RightGuardIKTarget")
    left_ik = add_hand_ik(armature, "Left", left_target)
    right_ik = add_hand_ik(armature, "Right", right_target)

    for frame in range(FRAME_START, FRAME_END + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        copy_pose(run_armature, armature)

        cycle_t = (frame - FRAME_START) / max(1, FRAME_END - FRAME_START)
        settle = 0.5 + 0.5 * math.sin(cycle_t * math.tau)
        strength = 1.0
        apply_guard_body_pose(armature, strength, settle)
        bpy.context.view_layer.update()

        head = armature.pose.bones["mixamorig:Head"]
        face = armature.matrix_world @ head.head
        top = armature.matrix_world @ head.tail
        target_z = face.z + (top.z - face.z) * 0.38
        left_guard = face.copy()
        left_guard.x = -0.24
        left_guard.y = face.y - 0.20
        left_guard.z = target_z
        right_guard = face.copy()
        right_guard.x = 0.24
        right_guard.y = face.y - 0.22
        right_guard.z = target_z - 0.03

        left_target.location = left_guard
        right_target.location = right_guard
        left_ik.influence = strength
        right_ik.influence = strength

        key_target(left_target, frame)
        key_target(right_target, frame)
        left_ik.keyframe_insert(data_path="influence", frame=frame)
        right_ik.keyframe_insert(data_path="influence", frame=frame)
        key_all_bones(armature, frame)

    set_smooth_interpolation_for_all_actions()

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.nla.bake(
        frame_start=FRAME_START,
        frame_end=FRAME_END,
        step=1,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        clear_parents=False,
        use_current_action=True,
        bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    restore_run_lower_body(armature, run_armature)

    for target in (left_target, right_target):
        bpy.data.objects.remove(target, do_unlink=True)

    bpy.data.objects.remove(run_armature, do_unlink=True)

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
    clear_source_animation(armature)
    run_armature = import_run_armature()
    action = build_animation(armature, run_armature)
    export_fbx(armature)
    curve_count = sum(1 for _ in iter_action_fcurves(action))
    print(f"Exported {OUT_FBX}")
    print(f"Action {action.name}: frames {tuple(action.frame_range)}, curves {curve_count}")


if __name__ == "__main__":
    main()
