# Enemy Ranged Hit Aggro

## Context And Goal

Enemies hit by ranged magic should actively chase the player instead of only standing up.

## Success Criteria

- Ranged fireball hits trigger enemy aggro.
- Hit enemies refresh chase memory.
- If an enemy is returning home, a ranged hit cancels the return and resumes chase.
- Non-hostile NPCs do not become hostile from this logic.

## Planned Changes

- Add an explicit hostile-enemy hit aggro entrypoint, such as `aggroFromHit()`.
- Call that entrypoint from the fireball hit path when the target is a combat enemy.
- Refresh chase memory and cancel return state on hit.
- Keep friendly NPC hit behavior unchanged.

## Verification Plan

- Hit an enemy from range and confirm it chases.
- Hit an enemy while it is returning home and confirm it re-engages.
- Confirm friendly NPCs do not start enemy chase behavior.
- Run the project build after implementation.

## Assumptions

- This doc covers the formal ranged-hit aggro plan.
- Later leash-memory duration tuning remains an implementation refinement.
