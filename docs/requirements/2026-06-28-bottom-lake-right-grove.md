# Bottom Lake Right Grove

## Context And Goal

The bottom depression lake currently keeps a full round water mesh, which can appear to extend under the terrain on the right side from the supplied view. The right-side dry area should become a natural shoreline grove instead of hidden water.

## Success Criteria

- The bottom lake no longer presents as a full circle continuing under the right-side terrain.
- The right-side missing/dry area near the lake has about 20 trees.
- Trees do not spawn inside the lake water, on the immediate shore clearance band, or inside existing forest placements.

## Planned Changes

- Replace the bottom lake's forced circular boundary with a locally recessed boundary on the right-side shoreline.
- Keep the lake's existing flat-bed and water-depth settings.
- Re-anchor the bottom-lake grove generator to the recessed right-side shoreline and place trees outside the lake clearance band.

## Test/Verification Plan

- Run `npm run build`.
- Check the bottom lake area visually from the supplied viewpoint.
- Confirm the scoped commit includes only the requirement document and the map change.

## Assumptions And Out Of Scope

- "Right side" means the dry/grass area beside the visible lake edge in the screenshot.
- This change intentionally makes the lake non-perfectly circular.
- No shrubs, rocks, new paths, or new assets are included.
