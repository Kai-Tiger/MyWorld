# Negative Pitch Camera Distance

## Context And Goal

When the user looks upward using negative pitch, the camera can feel like it is viewing from under the player. The camera should allow negative pitch but move closer to the character as the pitch becomes more negative.

## Success Criteria

- Negative pitch remains allowed.
- At `pitch >= 0`, camera distance uses the normal zoom distance.
- At `pitch < 0`, effective distance decreases smoothly.
- At maximum negative pitch, effective distance is about 58% of base distance.
- Effective distance never goes below `2.8`.

## Planned Changes

- Restore `minPitch = -30°`.
- Add a helper that computes effective camera distance from pitch.
- Use effective distance in desired camera positioning.
- Keep mouse direction, scroll zoom, and obstruction logic unchanged.

## Verification Plan

- Look upward/negative pitch and confirm the camera moves closer.
- Confirm positive pitch uses the normal distance.
- Confirm no camera-under-foot feeling at max negative pitch.
- Run the project build after implementation.

## Assumptions

- This doc captures the selected “只动态拉近” strategy.
- It intentionally does not add new UI or camera settings.
