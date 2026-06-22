# Remove Night Stars

## Context and Goal

The sky system currently creates white star particles that fade in and flicker at night. The goal is to remove star rendering while keeping the rest of the night sky intact.

## Success Criteria

- No star particles are created or shown at night.
- Moon, moon halo, sky dome, clouds, fog color, and day-night color changes continue to work.
- Existing `sky.update(...)` callers do not need to change.

## Planned Changes

- Remove the star particle factory from `src/scene/sky.js`.
- Remove `starPoints` creation, camera-follow positioning, timing state, and night flicker updates.
- Leave moon and night factor shader uniforms unchanged.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify night sky has no white star points and the moon still appears.

## Assumptions and Out of Scope

- "Remove" means deleting star particle rendering rather than hiding it with zero opacity.
- This does not remove the moon, night colors, fog adjustments, clouds, or lighting changes.
