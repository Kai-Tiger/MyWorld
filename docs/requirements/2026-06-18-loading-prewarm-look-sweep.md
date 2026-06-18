# Loading Prewarm Look Sweep

## Context And Goal

The first time the camera looks toward the old church ruins, the game stutters. During loading, the game should prewarm rendering by keeping the player at spawn and rotating a camera in place before showing gameplay.

## Success Criteria

- Loading remains hidden while prewarm runs.
- The player does not move during prewarm.
- A temporary camera rotates in place at spawn, sweeping yaw for two full turns.
- Outdoor scene rendering is warmed before the loading overlay disappears.
- The formal third-person camera is restored before gameplay starts.

## Planned Changes

- Add a startup prewarm function using a temporary camera at the spawn camera position.
- Rotate yaw 360 degrees twice while rendering the outdoor scene each frame.
- Run prewarm after model loading, ruins readiness, and scene compile.
- Remove loading overlay only after prewarm completes.

## Verification Plan

- Start the game and confirm loading stays visible until prewarm completes.
- Confirm the player remains at spawn.
- After loading, rotate toward the ruins and confirm first-view stutter is reduced.
- Run the project build after implementation.

## Assumptions

- This doc captures the final user-confirmed version: camera turns in place, not player orbiting or moving.
