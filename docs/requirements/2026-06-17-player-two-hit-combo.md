# Player Two-Hit Combo

## Context And Goal

The player's `J` attack has too much recovery. Add a two-hit combo using the new `player/SwordAttack2.fbx` animation.

## Success Criteria

- Pressing `J` performs the existing first attack.
- Pressing `J` again during the combo window triggers a second attack.
- The second attack uses `SwordAttack2.fbx`.
- Each attack has its own hit window.

## Planned Changes

- Load `src/characters/player/SwordAttack2.fbx`.
- Add player combo state for first and second attack.
- Add a second hit window while preserving existing first-hit logic.
- Keep non-combo attack behavior unchanged when no second input is provided.

## Verification Plan

- Press `J` once and confirm the first attack works.
- Press `J` twice in the combo window and confirm the second animation plays.
- Confirm both attacks can hit enemies during their intended windows.
- Run the project build after implementation.

## Assumptions

- This doc covers the initial two-hit combo plan.
- Later timing, damage, range, and lunge changes are split into separate requirement docs.
