# Global Dendritic Gully Terrain

## Context and Goal

The terrain still reads too smooth at map scale because existing gullies are mostly hand-authored local paths. Add a global procedural erosion layer so the whole outdoor map is visually divided by branching dry gullies and deeper drainage cuts similar to the reference heightmap.

## Success Criteria

- Broad slopes across the map are visibly broken by dendritic gullies.
- The erosion visibly divides broad slopes without cutting deeper than about `5m`.
- Existing buildings and critical structures remain protected by the existing terrain protection mask.
- Existing river, lake, and channel carving still runs after the global erosion layer.
- `npm run build` succeeds.

## Planned Changes

- Add a global procedural dendritic erosion height modifier.
- Insert it after large mountain shaping and before water/channel carving.
- Reuse the same procedural mask in terrain and distant proxy materials to darken/rock-up gully bottoms.
- Do not change world size, chunk loading, water mesh generation, or authored gully arrays.

## Test and Verification Plan

- Run `npm run build`.
- Inspect the height modifier order.
- Check high-angle views for stronger full-map drainage division.
- Check protected areas such as castle, spawn, mine cave, old church, and campfires.

## Assumptions and Out of Scope

- Global gully depth should vary deterministically between about `2m` and `5m`.
- Only building/structure protection is strict; ordinary natural water edges and slopes may be reshaped.
- This is procedural erosion, not direct import of the reference image as a world heightmap.
