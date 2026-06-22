# Lock Camera Only Free Movement

## Context and Goal

Lock-on movement currently forces the player body to face the target and suppresses running. This makes left, right, and backward movement look like sliding. Lock-on should only keep the enemy centered by camera behavior while the player turns naturally toward movement direction.

## Success Criteria

- Lock-on keeps the target near screen center through camera yaw.
- Player body turns toward left, right, forward, or backward movement direction while locked.
- Lock-on no longer suppresses running.
- Non-lock movement and combat actions keep their current behavior.

## Planned Changes

- Keep lock-on movement basis from the target direction.
- Pass `suppressRun = false` and `lockFacingTarget = null` for normal outdoor lock-on movement.
- Remove the post-update hard `player.faceToward(target)` call from lock camera tracking.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify locked left/right/back movement turns the player naturally, locked running works, and the camera still tracks the enemy.

## Assumptions and Out of Scope

- Lock-on is a camera behavior, not a body-facing constraint.
- No strafing animations or movement input remapping are added.
- Attack, roll, hurt, spell, and target switching logic are unchanged.
