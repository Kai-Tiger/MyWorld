# Bottom Lake Right Grove

## Context And Goal

The bottom depression lake currently keeps a full round water mesh, which can appear to extend under the terrain on the right side from the supplied view. The area centered at `pos=(82.7, -275.8)` should become a natural shoreline grove instead of hidden water.

## Success Criteria

- The bottom lake no longer presents as a full circle continuing under the right-side terrain.
- The area within a 20m radius of `pos=(82.7, -275.8)` has 20 combined trees and shrubs.
- A few random rocks sit within the same radius.
- Trees and shrubs may slightly enter the bottom lake shallows, but should not heavily overlap existing forest placements.

## Planned Changes

- Replace the bottom lake's forced circular boundary with a locally recessed boundary on the right-side shoreline.
- Keep the lake's existing flat-bed and water-depth settings.
- Re-anchor the bottom-lake grove generator to `pos=(82.7, -275.8)` with a 20m placement radius.
- Mix tree and shrub placements, and add a small number of random rocks.

## Test/Verification Plan

- Run `npm run build`.
- Check the bottom lake area visually from the supplied viewpoint.
- Confirm the scoped commit includes only the requirement document and the map change.

## Assumptions And Out Of Scope

- "Right side" means the dry/grass area beside the visible lake edge in the screenshot.
- This change intentionally makes the lake non-perfectly circular.
- No new paths, terrain props, or assets are included.
