# Random Forest Pack Trees Without Spawn Grass

## Context And Goal

The spawn-area grass pass is visually unsatisfactory. Remove the recently added runtime grass layers and use forest-pack tree assets for deterministic random map decoration instead.

## Success Criteria

- No runtime spawn grass carpet or `spawn_grass*` GLB instances are created.
- The outdoor map includes additional randomly distributed `/models/forest_pack/tree_01..04.glb` trees.
- Random trees avoid the spawn area, campfires, old church, castle entrance/approach, and canyon walk path.
- Existing forest-pack labels and colliders continue to work for forest-pack objects.
- The project builds successfully.

## Planned Changes

- Remove spawn grass constants, placement functions, instanced rendering, wind material updates, terrain regrounding, and loader calls from `src/scene/map.js`.
- Remove the obsolete `spawnGrassAvoidance` option from `createMap(...)` and its caller in `src/main.js`.
- Add deterministic random forest-pack tree placements to the existing `FOREST_GROVE_PLACEMENTS` flow.
- Keep historical terrain materials, older model names, and requirement notes unchanged.

## Test / Verification Plan

- Run `npm run build`.
- Search runtime code for removed grass identifiers such as `SPAWN_GRASS`, `loadSpawnGrass`, `spawn_grass`, and `wind_grass`.
- Launch the dev scene and visually confirm that spawn grass is gone, random forest-pack trees appear, and core routes remain passable.

## Assumptions And Out Of Scope

- "Tree package" means `/models/forest_pack/tree_01..04.glb`.
- Existing forest grove shrubs may still use `background_tree_*`; only the new spawn grass system is removed.
- Tree instancing optimization is out of scope unless runtime performance requires it later.
