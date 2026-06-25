# Ground Speed and Air Speed Split

## Context and Goal
The player's grounded movement speed should return to `5`, while airborne horizontal movement should stay at `50`.

## Success Criteria
- Grounded player movement uses `5.0` as the base speed.
- Airborne horizontal movement uses `50.0` as the base speed.
- Debug flying movement keeps its existing `50` horizontal speed.
- Grounded water movement remains a reduced version of the grounded speed.

## Planned Changes
- Split the existing shared player movement speed into ground and air constants.
- Select the non-flying movement speed based on whether the player is grounded or airborne.
- Leave debug flying speed unchanged.

## Test/Verification Plan
- Run `npm run build`.
- Check that `GROUND_MOVE_SPEED`, `AIR_MOVE_SPEED`, and `FLY_MOVE_SPEED` are distinct constants.

## Assumptions and Out of Scope
- "Air speed" means normal jumping/falling horizontal movement.
- Existing stamina depletion and defense movement multipliers continue to apply.
- No animation timing or flight key behavior changes are in scope.
