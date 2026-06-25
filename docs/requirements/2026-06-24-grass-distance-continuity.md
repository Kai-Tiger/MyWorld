# Grass Distance Continuity

## Context and Goal
The distant meadow currently reads as green speckles over a pale ground surface. The cause is that distant 3D grass blades remain visible as high-frequency geometry while the terrain material underneath lacks a continuous grass-color layer. The goal is to make grassland read as broad, natural green and yellow-green patches at distance, while keeping 3D grass for near detail.

## Success Criteria
- Distant grass appears as a few stable small clumps inside broad grassland areas, not as whole cells popping on/off.
- Meadow and riverside grass no longer appears through visible square render chunks.
- Near grass keeps 3D volume and wind motion.
- Grass uses 3D player-to-instance distance: it starts reducing after 20m, keeps about 8% sparse clumps around 100m, and hides after 120m.
- Terrain grass color does not cover rock, snow, water edges, or dry channel cores.
- Existing grass placement and exclusion rules are preserved.

## Planned Changes
- Keep full 3D grass near the player, then reduce grass from 20m, keep only sparse clumps by 100m, and hide grass after 120m using player-to-grass 3D distance.
- Replace meadow/riverside render chunks with global high/low InstancedMesh groups per grass variant.
- Enqueue deterministic meadow grid points inside the player's 120m grass radius, then process them with a small per-frame budget.
- Split the meadow grid discovery pass itself into a small per-frame scan queue, so the first 120m radius scan does not create a single-frame stall.
- Cache each meadow grid point's static planting result after height/water/exclusion checks so `getGroundHeight()` is not repeated every LOD tick.
- Use instance-level distance checks plus a stable low-frequency cluster rank, so LOD keeps scattered clumps instead of square cell prefixes.
- Add a low-frequency yellow/green grassland layer to the terrain shader and distant terrain proxy so hidden far grass still reads as grassland.
- Keep existing grass models, wind shader, and placement logic.

## Test/Verification Plan
- Run `npm run build`.
- Use Playwright against `http://127.0.0.1:3000/` and inspect `[grass-profile]` logs.
- Static-check that tree LOD and water rendering are not changed.

## Assumptions and Out of Scope
- Image quality is prioritized over keeping all far 3D grass visible.
- No new grass model or texture asset is required.
- Meadow grass has no full-map cell scanner; 120m outside the player is represented by terrain color, not 3D grass.
- Profiling output was used during verification and is disabled by default after the performance fix.
