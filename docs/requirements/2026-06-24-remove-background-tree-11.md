# Remove Background Tree 11 From Map

## Context and Goal
The low, dense leaf-card object shown in the reference screenshot matches `background_tree_11.glb` from the forest pack. It should no longer appear in the generated or curated outdoor map.

## Success Criteria
- `background_tree_11.glb` is no longer selected by forest-pack shrub generation.
- `background_tree_11.glb` is no longer part of world-tree instanced model generation.
- Explicit curated placements no longer include `background_tree_11.glb`.
- The model file remains in `public/models/forest_pack/` for asset-library continuity.

## Planned Changes
- Remove `background_tree_11.glb` from `FOREST_GROVE_SHRUB_TYPES`.
- Remove `background_tree_11.glb` from `WORLD_TREE_MODELS`.
- Remove the explicit north highland placement for `background_tree_11.glb`.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that `src/scene/map.js` has no active `background_tree_11.glb` references.
- Browser-check that the removed object no longer appears and remaining forest-pack assets still load.

## Assumptions and Out of Scope
- The target object is `background_tree_11.glb`.
- This does not delete the GLB asset file.
- This does not alter other background tree variants.
