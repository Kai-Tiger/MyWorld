# Close Lock Face Target

## Context and Goal

Lock-on currently keeps the enemy centered with the camera while allowing the player body to turn toward movement direction. At close combat range, the player should face the locked enemy again for better melee readability.

## Success Criteria

- Locked movement beyond 5 units keeps free movement-facing behavior.
- Locked movement within 5 units makes the player face the enemy.
- Lock-on still allows running.
- Rolling and block impact reaction are not hard-overridden by close facing.

## Planned Changes

- Add a 5-unit close lock facing threshold in `src/main.js`.
- In the outdoor lock camera block, face the player toward the locked target only when the squared distance is within that threshold.
- Keep `player.update(..., false, null)` unchanged so lock-on does not suppress running.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify close locked movement faces the target, far locked movement turns with movement direction, and lock-on running still works.

## Assumptions and Out of Scope

- Distance uses horizontal XZ separation from the existing lock target vector.
- This only affects outdoor lock-on behavior.
- No animation assets, combat values, or input mappings are changed.
