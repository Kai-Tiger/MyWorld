# Death Runtime Continues Until Black Screen

## Context And Goal

When the player dies, enemy animations and scene mechanisms should continue running until the fade reaches black. After respawn, state should reset as before.

## Success Criteria

- Outdoor enemies keep updating during the death fade.
- Castle indoor mechanisms and enemies continue their existing logic during the death fade.
- The black-screen respawn flow still resets player and enemy state.
- Respawn behavior remains compatible with bonfire/checkpoint logic.

## Planned Changes

- Separate death-scene runtime updates from normal player-control updates.
- During outdoor death fade, keep updating outdoor map/castle facade/enemies.
- During castle death fade, keep calling castle update for mechanisms such as elevator, torches, and doors.
- Keep existing respawn reset path once fade-to-black completes.

## Verification Plan

- Die outdoors and confirm enemy animation continues until black screen.
- Die in castle and confirm mechanisms continue until black screen.
- Confirm respawn still resets player and enemies correctly.
- Run the project build after implementation.

## Assumptions

- Ordinary indoor scene currently has no dynamic enemy/mechanism update interface; this doc preserves existing behavior there.
