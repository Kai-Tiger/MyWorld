# Grass Height Cluster Falloff

## Context And Goal

The global model grass used a hard height cutoff, which could create a rigid grass line on hillsides. The goal is to replace that hard cutoff with height-based cluster falloff so high terrain keeps sparse natural patches instead of isolated random blades or a clean empty band.

## Success Criteria

- Low terrain keeps the existing global grass density.
- Grass gradually becomes sparse with height.
- High terrain keeps small clustered patches rather than single-blade random scatter.
- Existing water, river bank, campfire, and footprint exclusions still apply.
- Build passes after the change.

## Planned Changes

- Replace the hard maximum grass height with fade start/end and cluster coverage parameters.
- Use deterministic low-frequency value noise to form high-altitude grass clusters.
- Apply the cluster mask inside the global model grass placement filter.
- Leave grass LOD distances, generation budgets, density controls, and river grass unchanged.

## Test And Verification Plan

- Search for the old hard height cutoff and confirm it is no longer used.
- Run `npm run build`.
- In game, inspect hillsides around the old grass line and confirm sparse patches remain without a straight cutoff.

## Assumptions

- The requested "grass line" refers to global model grass height filtering.
- Default falloff is 80m to 160m with about 2% high-altitude cluster coverage.

## Out Of Scope

- Changing grass LOD distance behavior.
- Changing total grass density or debug panel controls.
- Changing riverbank grass or tree-understory grass generation.
