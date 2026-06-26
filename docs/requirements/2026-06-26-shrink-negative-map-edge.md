# Shrink Negative Map Edge

## Context and Goal

The outdoor map currently extends far toward negative X and negative Z, but that area is not part of the intended play route. The goal is to shrink the negative-side terrain while moving the edge mountain ridge inward, so the new boundary still has a visible mountain wall instead of appearing as if the old ridge was deleted.

## Success Criteria

- Negative X and negative Z map edges move inward.
- Positive X and positive Z edges remain unchanged.
- Terrain chunk coverage matches the new negative-side extension.
- Edge mountains, cliff skirt, world trees, grass bounds, collision broadphase, and fall/death bounds continue to fit the new shared outdoor bounds.
- The negative-side edge ridge height band is shifted inward with the new edge, so the high ridge appears before the cropped terrain ends.
- Existing rivers, gullies, lakes, trees, grass, water, and authored placements are not moved or deleted.

## Planned Changes

- Change `OUTDOOR_MOUNTAIN_BOUNDS.minX/minZ` from `-2360` to `-1560`.
- Reduce `OUTDOOR_COLLISION_HALF_SIZE` from `2420` to `1620`.
- Change `createHeightmapTerrain` negative-side extension from `1600` to `800` for both X and Z.
- Shift the negative-side edge ridge in `applyExtendedRegionHeight` from the old `1500 -> 2300` band to `700 -> 1500`.
- Update nearby comments so the configured values remain understandable.

## Test and Verification Plan

- Run `git diff --check`.
- Run `npm run build`.
- Run the local dev server and confirm the page and canvas load.
- Verify that the negative X/Z edge appears closer, the high edge ridge still exists near the new boundary, and center, castle-side, and snow-side areas still load normally.

## Assumptions and Out of Scope

- Default shrink amount is half of the previous negative-side extension: `1600m -> 800m`.
- This does not clean up or move existing authored far negative-side terrain feature definitions.
- This does not change `WORLD_SIZE` or positive-side bounds.
