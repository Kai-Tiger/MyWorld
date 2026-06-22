# Enemy Hit Aggro After Hurt

## Context and Goal

When a spell hits an enemy and triggers the enemy hurt animation, the enemy can stand up but stop attacking. The cause is combat engagement starting while the enemy is still marked as hurting, which can interrupt the hurt action without clearing the hurting state.

The goal is to let hurt finish first, then continue hit aggro into the existing stand, dash, chase, or attack flow.

## Success Criteria

- A spell-hit enemy that survives and plays hurt resumes combat after hurt ends.
- A spell-hit enemy that does not play hurt still engages normally.
- Death still cancels combat and hurt behavior.
- Enemy attack ranges, attack windows, and spell damage remain unchanged.

## Planned Changes

- Guard `startEngagementSequence()` so it does not start alert, guard dash, or stand actions while `hurting` is true.
- Preserve the engagement reason while hurt is active.
- Let the next normal AI update start engagement after hurt clears.

## Test / Verification Plan

- Build with `npm run build`.
- Manual follow-up: hit a seated enemy with fireball, confirm it plays hurt if applicable and then attacks or chases.
- Manual follow-up: hit an enemy with fireball without triggering hurt, confirm it still engages immediately.

## Assumptions and Out of Scope

- Hurt animation should take priority over engagement startup.
- This change does not alter spell collision, spell damage, enemy balance values, or player hurt logic.
