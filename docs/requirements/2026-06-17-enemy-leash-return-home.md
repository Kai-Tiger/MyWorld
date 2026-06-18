# Enemy Leash And Return Home

## Context And Goal

Enemies should pursue farther, but stop chasing if pulled too far from their initial position. When leashed, they should return home using the walk animation.

## Success Criteria

- Enemy aggro range is increased.
- Enemies stop chasing after exceeding a leash radius from their home position.
- Returning enemies walk back to their starting point and restore their initial facing direction.
- Return behavior uses `enemy/walk.fbx`.

## Planned Changes

- Record each enemy's initial position and rotation.
- Add enemy tuning values:
  - `leashRadius = 24`
  - `returnSpeed = 1.6`
  - `returnArriveDistance = 0.35`
- Add a `returningHome` state that uses the walk animation and existing local avoidance.
- Restore idle/sitting state after arriving home.

## Verification Plan

- Pull an enemy beyond 24 units from home and confirm it returns.
- Confirm the enemy uses walk animation while returning.
- Confirm the enemy resumes normal idle state at home.
- Run the project build after implementation.

## Assumptions

- User selected the recommended 24-unit leash radius.
- This doc covers the formal plan in “敌人追逐半径与归巢”.
