# Equipment Diamond HUD And Hammer Switching

## Context And Goal

The game needs a Dark Souls-like lower-left equipment HUD with a diamond layout and keyboard weapon switching. The new hammer model should be available as a switchable weapon.

## Success Criteria

- Lower-left UI shows a diamond equipment layout:
  - top: spell
  - left: shield
  - right: weapon
  - bottom: item
- Pressing `Z` switches the equipped weapon.
- `weapons/hammer.glb` can be equipped and appears in the player hand.
- Existing player model remains visible after switching.

## Planned Changes

- Add the lower-left diamond equipment UI.
- Add keyboard input handling for `Z` weapon switching.
- Load and bind the hammer GLB as an alternate weapon.
- Preserve existing weapon/shield display behavior when switching.

## Verification Plan

- Confirm the diamond HUD renders in the lower-left corner.
- Press `Z` and confirm the hammer equips.
- Confirm the player body, shield, and equipped weapon remain visible.
- Run the project build after implementation.

## Assumptions

- This doc covers the formal equipment plan followed by `Implement the plan`.
- Later hammer scale, rotation, and grip tuning are implementation refinements.
