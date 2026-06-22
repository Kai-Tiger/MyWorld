# Mine S Path Collision Width

## Context And Goal

The mine cave S path looks wide enough to pass, but the player can still be blocked by invisible wall collision around bends. The fix should keep the mine layout continuous while improving practical clearance.

## Success Criteria

- The S path from the first mine hall to the second hall is visibly wider.
- The player has clear movement space through the center and near-center sides of the S path.
- Wall collision stays close to the cave walls but does not intrude into the walkable bend area.
- The change does not alter the ladder, shaft, or general mine entry behavior.

## Planned Changes

- Increase the S path route width from 3.7m to 5.2m in the Blender generation script.
- Move S path wall colliders slightly outside the visible wall line and reduce their thickness.
- Shorten wall colliders near bend endpoints to avoid collision pinching at turns.
- Enlarge S path floor and underground zone colliders around bend nodes.
- Move the first hall back-opening collision edges outward so the widened S path entrance does not pinch.
- Regenerate the Blender file, GLB, and mine cave collider manifest.

## Test And Verification Plan

- Run a local collision sampling check against the exported collider manifest for centerline and side-offset points along the S path.
- Run `npm run build`.

## Assumptions And Out Of Scope

- The player collision radius remains the current default of about 0.4m.
- This change only targets S path width and collision; it does not redesign the mine cave layout.
- Browser or Playwright verification is out of scope unless explicitly requested.
