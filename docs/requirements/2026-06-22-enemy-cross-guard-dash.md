# Enemy Cross Guard Dash

## Context and Goal

When an enemy discovers the player from farther than the configured dash trigger distance, it should stand up, play `cross_guard.fbx` once, and quickly move toward the player until it reaches the configured stop distance. If the player is already close enough, the enemy should use the existing normal approach and attack flow.

## Success Criteria

- `cross_guard.fbx` is loaded and used as a one-shot enemy action.
- All new trigger distance, stop distance, speed multiplier, and hit-aggro behavior values live in `BALANCE.combat.enemy`.
- Discovery at a distance greater than `guardDashTriggerDistance` triggers stand once, then cross guard dash once.
- Discovery at or below `guardDashTriggerDistance` does not trigger cross guard dash.
- The dash stops at `guardDashStopDistance` or when the action ends, then returns to normal combat logic.
- Hurt, death, return-home, occlusion, and disengage clear the dash state.
- `npm run build` succeeds.

## Planned Changes

- Add `guardDashTriggerDistance`, `guardDashStopDistance`, `guardDashSpeedMultiplier`, and `guardDashUseOnHitAggro` to enemy balance config.
- Import and load `src/characters/enemy/cross_guard.fbx` in `enemyNpcFBX.js`.
- Add a small `guardDash` state with `stand` and `dash` phases.
- Move the enemy with existing collision-aware movement while `crossGuardAction` plays once; the speed multiplier is the minimum dash speed, and farther starts may temporarily use a higher computed speed to reach the stop distance during the one-shot action.

## Test and Verification Plan

- Statically verify all new values come from config, not hard-coded logic.
- Verify the one-shot action setup and state cleanup branches.
- Run `npm run build`.

## Assumptions and Out of Scope

- The configured defaults are trigger distance `3m`, stop distance `1m`, and minimum speed multiplier `1.8`.
- Hit aggro uses the same dash by default.
- This does not change normal run, attack range, or attack windows.
