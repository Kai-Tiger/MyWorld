# Newland Dendritic Dry Gullies

## Context and Goal
Add multiple tree-shaped dry river-gully networks in the expanded newland area. They should come down from higher gentle slopes, avoid actual water surfaces, cut visibly deeper into the terrain, clear nearby trees, and leave only sparse grass with light grass-green terrain tint.

## Success Criteria
- Five dendritic dry-gully groups are placed across the expanded newland area.
- Gully paths run from higher outer slopes toward lower inner gentle slopes.
- Gullies do not generate water surfaces or enter `sampleRiver()`.
- Trees are excluded around the gully networks.
- Meadow grass remains sparse near gullies.
- Terrain shader shows a light grass-green gully/apron tint instead of dark wet-mud river coloring.

## Planned Changes
- Add independent `NEWLAND_DENDRITIC_GULLIES` data and bounds in `src/scene/map.js`.
- Add dry-gully sampling and `applyDendriticGullyHeight()` for deeper terrain cutting.
- Add tree clearance and meadow grass thinning around the new gully networks.
- Add a GLSL sampler and light green terrain tint for the gully network.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that new gullies are dry-only and do not join unified water rendering or `sampleRiver()`.

## Assumptions and Out of Scope
- Tree-shaped river gullies are dry erosion channels, not flowing rivers.
- "避开水面" means paths avoid lake interiors, outlet water, braided rivers, and the old main river.
- No browser or Playwright verification unless explicitly requested.
