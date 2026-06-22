# Enemy Guard Dash Stand Timeout

## Context and Goal

After the first enemy is defeated, triggering a second enemy can leave it standing without attacking. The likely cause is the guard dash stand phase depending only on the stand animation's `finished` event to advance.

The goal is to make the stand phase fail-safe so an enemy always proceeds to dash, chase, or attack after it enters combat.

## Success Criteria

- A second enemy triggered after the first enemy dies does not remain stuck in the guard dash stand phase.
- Guard dash still plays the stand animation when available.
- If the stand animation `finished` event does not fire, the enemy advances after a short timeout.
- Existing death, return-home, occlusion, attack-window, and player hurt behavior is unchanged.

## Planned Changes

- Add a local stand-phase timer to `enemyNpcFBX.js`.
- Initialize the timer when `startGuardDash()` enters `guardDashPhase = 'stand'`.
- Decrement the timer in `updateGuardDash()` and call `startGuardDashRun()` when it expires.
- Clear the timer whenever guard dash stops or advances to dash.

## Test / Verification Plan

- Build with `npm run build`.
- Manual scenario for follow-up playtest: kill the first enemy, trigger the second enemy, and confirm it advances into dash, chase, or attack instead of standing still.

## Assumptions and Out of Scope

- The issue is a state-machine stall, not a per-enemy spawn or balance configuration problem.
- This does not change enemy attack distance, damage windows, cooldowns, or player hurt/block handling.
