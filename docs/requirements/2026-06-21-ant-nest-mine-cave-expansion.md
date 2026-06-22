# Ant Nest Mine Cave Expansion

## Context and Goal
The mine cave should grow from a single tunnel and hall into a larger ant-nest style underground space. The Blender file is the source of truth for both visuals and simplified collision helpers, so future manual Blender edits can be exported without hand-syncing many coordinates in game code.

## Success Criteria
- `assets/blender/mine_cave.blend` contains the expanded cave visuals and hidden `COL_*` collision helpers.
- Export produces `public/models/mine_cave/mine_cave.glb` and `public/models/mine_cave/mine_cave_colliders.json`.
- The game loads the JSON for cave floor, wall, and underground zone data.
- The surface entry remains a single shaft at `(36, 35)`, with existing ladder interaction unchanged.
- Underground expansion reads as one continuous walkable route, with no disconnected floor pieces at bends or room entrances.
- Underground routes are enclosed by floors, walls, ceilings, and end caps.

## Planned Changes
- Add a Blender export script for the mine cave source blend.
- Add manifest loading for mine cave colliders and underground zones.
- Keep core shaft/ladder safety colliders in code, with old rectangular cave colliders as a fallback when the manifest is unavailable.
- Support oriented rectangle surfaces in the collision system.
- Expand the current Blender scene with a continuous winding main route and connected side pockets, using matching `COL_SURFACE_*`, `COL_WALL_*`, and `COL_ZONE_*` helpers.

## Test/Verification Plan
- Use Blender export to update the GLB and collider JSON.
- Inspect generated JSON for colliders and zones.
- Run `npm run build`.

## Assumptions and Out of Scope
- Collision remains simplified box/rotated-box based, not per-triangle mesh collision.
- This task only expands space and collision; it does not add enemies, loot, mining interactions, or map UI.
- New branches stay within the existing outdoor collision bounds.
