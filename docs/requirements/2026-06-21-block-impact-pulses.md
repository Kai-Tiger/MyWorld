# Block Impact Pulses

## Context and Goal

Enemies can have multiple attack windows in one attack animation. When the player blocks several windows with the shield, each successful block should produce a distinct impact response instead of merging into one long shake.

## Success Criteria

- Each blocked enemy attack window records its own block impact.
- A new block impact restarts the short shield shake pulse so repeated hits are visible.
- Shield hit sound and hitstop can fire for each recorded impact, capped to avoid excessive same-frame feedback.
- Existing block stamina cost, HP prevention, and recoil limits remain unchanged.

## Planned Changes

- In `src/entities/player.js`, set `blockShakeTime` to `BLOCK_SHAKE_DURATION` on each successful block instead of accumulating it.
- Keep the existing capped `blockRecoilRemain` accumulation so repeated blocks do not push the player too far.
- In `src/main.js`, consume up to three block impacts per frame and play the existing shield sound and hitstop for each consumed impact.

## Test/Verification Plan

- Hold defense while an enemy attack with three windows connects.
- Confirm each block window gives its own impact response.
- Confirm HP does not drop and stamina is consumed per blocked window.
- Confirm recoil remains bounded.
- Run `npm run build`.

## Assumptions and Out of Scope

- This does not add perfect block, parry, new shield animations, camera shake, or particles.
- This preserves the existing outdoor combat feedback path.
