# Model Grass Variants

## Context and Goal

The map already has dark model grass. Add two more model-grass variants so the existing grass patches include some tender green clumps and some dry yellow clumps.

## Success Criteria

- Existing dark grass remains available as `grass_clump_low.glb`.
- New tender green grass exists as `grass_clump_fresh.glb`.
- New dry yellow grass exists as `grass_clump_dry.glb`.
- The new variants have distinct silhouettes, not only different colors.
- Existing grass patches mix dark, fresh, and dry clumps deterministically.
- Grass placement density, clearings, collision, and wind behavior remain unchanged.
- `npm run build` succeeds.

## Planned Changes

- Parameterize the Blender grass generator to export three GLB variants.
- Make the fresh variant denser, shorter, more upright, and tender green.
- Make the dry variant sparser, more bent/drooped, uneven, and yellow-brown.
- Split local grass placements into three `THREE.InstancedMesh` batches by deterministic variant assignment.
- Animate all variant batches with the existing lightweight wind shader.
- Add the two new GLB files to runtime preloading.

## Test and Verification Plan

- Run the Blender grass export script.
- Confirm the three grass GLB files exist.
- Run `npm run build`.

## Assumptions and Out of Scope

- The two new grass forms are added in addition to the current dark grass.
- Mixed variants use the existing model-grass patch locations.
- Distant grass-card texture remains unchanged because it is not currently called at runtime.
- Browser-based visual checks are out of scope unless explicitly requested.
