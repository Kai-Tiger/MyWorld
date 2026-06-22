# Remove Large Ground Debris Patches

## Context and Goal

Large instanced ground debris planes can read as square leaf or twig texture cards on the outdoor map. Remove those large visual patches while keeping the smaller per-tree leaf scatter.

## Success Criteria

- No `ground_debris_*` instanced layers are added to the scene.
- `leaf1.png` and `leaf2.png` per-tree scattered leaves remain.
- Terrain, trees, rocks, enemies, and highland layout are unaffected.

## Planned Changes

- Stop calling the large ground debris layer builder during map terrain ready setup.
- Call `buildIndividualLeafLayer(scene)` directly so small per-tree leaves still render.
- Leave downloaded ground debris texture files in place.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify large square debris patches are gone and tree-level small leaves remain.

## Assumptions and Out of Scope

- The unwanted square patches are the Poly Haven `ground_debris_*` layers.
- Asset deletion is out of scope.
