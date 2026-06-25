# Newland Irregular Static Lake

## Context and Goal
The water feature near `(-444, -516)` should read as a lake instead of a narrow braided-river overlap. Shape it into a medium irregular ellipse, remove trees from the lake footprint, carve the ground into a basin, and keep the lake water attached to the lowered terrain.

## Success Criteria
- Lake center is near `x=-444, z=-516`.
- Lake footprint is an irregular ellipse around `70m x 45m`.
- Trees and related tree-under grass do not spawn inside the lake or its near shore buffer.
- Terrain inside the lake is lowered into a smooth basin.
- Lake water only appears where the terrain basin is below the water surface.
- Player water sampling treats the lake as still water with zero flow.

## Planned Changes
- Add a deterministic static lake sampler in `src/scene/map.js`.
- Add a terrain height modifier that carves the lake basin after newland braided-river shaping.
- Add lake water geometry to the unified water render path.
- Filter world trees and newland braided-river forest placements against the lake footprint plus a near-shore buffer.
- Include the lake in `sampleRiver(x, z)` water detection.

## Test/Verification Plan
- Run `npm run build`.
- Static-check the new helper wiring for terrain, water geometry, tree filtering, and water sampling.

## Assumptions and Out of Scope
- The lake is static and calm, not a flowing river section.
- The medium lake size is `rx=35`, `rz=22.5`.
- The tree removal buffer is `10m` beyond the irregular lake edge.
- No browser or Playwright verification unless explicitly requested.
- Existing rivers, campfires, castle, mine, and spawn position remain out of scope.
