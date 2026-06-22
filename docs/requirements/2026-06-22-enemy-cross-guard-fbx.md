# Enemy Cross Guard FBX

## Context and Goal

Create a new enemy animation FBX where the enemy runs for the whole clip while both arms stay crossed in front of the head and the upper body stays slightly bent forward. The asset should be standalone and not connected to runtime behavior yet.

## Success Criteria

- A new `src/characters/enemy/cross_guard.fbx` file exists.
- The FBX imports in Blender and contains one non-static action.
- The action uses the existing enemy armature bone names.
- The animation keeps a running lower body through the whole clip.
- Both arms stay crossed near the head with a slight forward crouch.
- No enemy runtime state-machine code changes are made.
- `npm run build` succeeds.

## Planned Changes

- Add `tools/blender/build_enemy_cross_guard.py`.
- Import `src/characters/enemy/main.fbx` as the target rig and `src/characters/enemy/run.fbx` as the source running motion.
- Copy the running pose into the target rig frame by frame over the existing 20-frame run cycle.
- Use temporary IK targets to keep both hands crossed in front of the head, then bake the result into a looping guard-run animation.
- Restore lower-body run bones with quaternion keyframes after IK baking so leg motion remains visible in the exported FBX.
- Export an armature-only FBX to `src/characters/enemy/cross_guard.fbx`.

## Test and Verification Plan

- Run the Blender generation script.
- Re-import `cross_guard.fbx` in Blender background mode.
- Verify an armature, one action, non-constant pose curves, changed leg/foot quaternion motion, and hands staying near the crossed guard area.
- Run `npm run build`.

## Assumptions and Out of Scope

- This is only an animation resource, not a gameplay guard/block feature.
- The source rig is `src/characters/enemy/main.fbx`.
- The running source animation is `src/characters/enemy/run.fbx`.
- Runtime integration, damage reduction, block windows, audio, VFX, and AI behavior are out of scope.
