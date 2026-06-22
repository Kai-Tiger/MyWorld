# Mine S Path Smooth Corners

## Context And Goal

The mine cave S path still catches the player on invisible blockers near sharp visual corners. The goal is to replace the hard polyline route with a smoother path and make collision clearance match the visible tunnel width.

## Success Criteria

- The S path bends are generated from a smooth sampled curve instead of hard control-point corners.
- The path clearance covers the visible walkable width and skips only matching S path or entry-opening wall blockers.
- The S path still blocks movement outside the intended tunnel.
- Ladder, shaft, player radius, and global movement behavior remain unchanged.

## Planned Changes

- Generate the S path from centripetal Catmull-Rom samples based on the existing six route control points.
- Use the sampled path for visual tunnel mesh, surfaces, zones, walls, and clearance manifest data.
- Increase S path clearance half width from 2.35m to 2.65m while keeping visual width at 5.2m.
- Bind first hall back-opening wall colliders to the S path clearance id.

## Test And Verification Plan

- Regenerate the Blender source, GLB, and collider manifest.
- Run offline collision sampling inside the S path at side offsets up to 2.55m.
- Confirm outer side samples remain mostly blocked outside the clearance path.
- Run `npm run build`.

## Assumptions And Out Of Scope

- Slight visual overlap near cave walls is acceptable if it removes invisible corner blockers.
- This is limited to the mine S path and first-hall S path opening.
- Browser and Playwright checks are out of scope unless explicitly requested.
