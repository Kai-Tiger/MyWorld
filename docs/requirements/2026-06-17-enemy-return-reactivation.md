# Enemy Return Reactivation

## Context And Goal

Enemies returning home after exceeding leash distance should still be able to re-aggro if attacked or if they see the player again.

## Success Criteria

- Returning enemies can be reactivated by player attacks.
- Returning enemies can be reactivated by sight.
- Reactivated enemies stop returning and chase the player.
- Enemies with active chase memory do not immediately re-enter return state.

## Planned Changes

- Let attack/hit events interrupt `returningHome`.
- Let sight detection call the aggro path while returning.
- Gate leash return so active chase memory can complete pursuit before another return decision.

## Verification Plan

- Pull an enemy past leash radius, let it return, then hit it and confirm chase resumes.
- Stand in sight of a returning enemy and confirm chase resumes.
- Run the project build after implementation.

## Assumptions

- This doc covers the formal return reactivation plan.
- It builds on the enemy leash and ranged-hit aggro systems.
