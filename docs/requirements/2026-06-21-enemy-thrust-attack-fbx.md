# Enemy Thrust Attack FBX

## Context and Goal

Create a new enemy combat animation as an FBX asset. The animation should be a short forward thrust attack built from the existing enemy rig, exported as a standalone animation resource, and left unconnected from runtime behavior for now.

## Success Criteria

- A new `src/characters/enemy/thrust_attack.fbx` file exists.
- The FBX can be imported by Blender and contains one animation clip.
- The animation uses the existing enemy armature bone names.
- Existing enemy attack behavior and `src/characters/enemy/attack.fbx` are unchanged.
- `npm run build` succeeds.

## Planned Changes

- Add a Blender generation script in `tools/blender/` that imports `src/characters/enemy/main.fbx`.
- Capture the enemy's current idle pose as the base pose, then keyframe a short thrust attack over about `0.85s`.
- Export an armature-only FBX to `src/characters/enemy/thrust_attack.fbx`.
- Do not modify enemy state-machine code or preload lists in this step.

## Test and Verification Plan

- Run the Blender generation script.
- Re-import `src/characters/enemy/thrust_attack.fbx` in Blender background mode and verify an armature and action are present.
- Run `npm run build`.

## Assumptions and Out of Scope

- The source rig is `src/characters/enemy/main.fbx`.
- The attack is a one-shot melee thrust, not a looping movement animation.
- Runtime integration, hit windows, audio, VFX, and AI attack selection are out of scope.
