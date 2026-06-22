# Mine S Path Corner Clearance

## Context And Goal

The mine cave S path can still catch the player on invisible wall collision around bends. The goal is to keep the visual tunnel enclosed while making turn movement feel continuous and reliable.

## Success Criteria

- The player can move through S path bends without hitting invisible wall corners.
- S path walls still block movement outside the intended tunnel.
- The fix only affects S path wall colliders and does not change general collision behavior.
- The mine cave manifest carries the S path clearance data used by runtime collision.

## Planned Changes

- Keep the S path visual width at 5.2m and preserve the existing continuous tunnel mesh.
- Keep S path wall colliders as outer fallback collision, but bind them to a clearance path id.
- Export a `paths` entry in the mine cave collider manifest with the S path centerline and passable half width.
- Load that path into runtime collision as a `clearancePath`.
- Skip only matching S path wall collisions when the player center is inside the path clearance capsule.

## Test And Verification Plan

- Regenerate the Blender source, GLB, and collider manifest.
- Run an offline collision check for centerline and side-offset S path samples, including bend points.
- Confirm points outside the clearance half width can still be blocked by S path wall collision.
- Run `npm run build`.

## Assumptions And Out Of Scope

- The player collision radius remains the current default of about 0.4m.
- This does not add a general navigation system; it is targeted at the mine S path.
- Browser and Playwright verification are out of scope unless explicitly requested.
