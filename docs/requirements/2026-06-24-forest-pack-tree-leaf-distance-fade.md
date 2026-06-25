# Forest Pack Tree Leaf Distance Fade

## Context and Goal
World trees already use cell-based instancing and LOD, but distant trees still render full crowns and all crown instances. Forest pack trees should start thinning leaves at 30m, and world-tree cells should draw fewer tree instances beyond 180m.

## Success Criteria
- All `/models/forest_pack` tree placements use stable sparse leaf rendering at distance.
- Forest pack trees keep full leaf density inside 30m.
- Forest pack tree crowns fade to 18% stable leaf coverage by 180m.
- World-tree cells draw 70% of their tree instances beyond 180m.
- World-tree crown and trunk instance counts stay matched.
- Existing world-tree trunk, grass, coverage, river, slope, snowline, and placement logic stays unchanged.

## Planned Changes
- Set forest pack leaf density thresholds to 30m full and 180m sparse.
- Add a shader hook that discards stable world-space leaf fragments according to a per-material keep ratio.
- Give world-tree crown instanced meshes per-cell fade materials so each cell can use its own distance keep ratio.
- Track handmade forest pack tree fade materials and update them from player distance on the existing tree visibility cadence.
- Sort world-tree instance matrices by stable per-tree rank, then use `InstancedMesh.count` to draw the first 70% beyond 180m.

## Test/Verification Plan
- Run `npm run build`.
- Verify forest pack trees remain visually full inside 30m.
- Verify 30m-180m tree crowns become visibly sparse.
- Verify beyond 180m world-tree cells draw about 70% of tree instances without crown/trunk mismatch.
- Static-check that world-tree placement density, coverage, and existing LOD visibility rules are not changed.

## Assumptions and Out of Scope
- "All forest_pack trees" means world instanced trees and handmade forest grove trees loaded from `/models/forest_pack`.
- Stable sparse dither is preferred over whole-crown transparency.
- The 70% instance reduction only applies to world-tree `InstancedMesh` trees, not handmade forest pack placements.
- This does not add new low-poly tree assets or change non-forest-pack tree models.
