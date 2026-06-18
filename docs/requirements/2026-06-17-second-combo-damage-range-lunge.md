# Second Combo Damage Range And Lunge

## Context And Goal

The second combo attack should feel stronger than the first by increasing damage/range and moving the character forward with inertia.

## Success Criteria

- Second attack damage is 20% higher than the base attack.
- Second attack hit range is 20% larger than the base attack.
- During the second attack, the player moves forward slightly.
- Forward movement respects collision and does not push through obstacles.

## Planned Changes

- Add second-attack damage multiplier `1.2`.
- Add second-attack range multiplier `1.2`.
- Add forward inertial movement during the second attack.
- Use existing collision checks for the lunge movement.

## Verification Plan

- Confirm the second attack hits from a slightly longer distance.
- Confirm second attack damage is higher than the first attack.
- Confirm lunge stops at obstacles.
- Run the project build after implementation.

## Assumptions

- This doc covers the formal second-combo tuning plan.
- The lunge is gameplay movement, not root motion extracted from the animation.
