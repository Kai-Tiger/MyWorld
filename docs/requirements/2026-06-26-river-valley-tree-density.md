# River Valley Tree Density

## Context and Goal

Newly carved valleys look sparser than surrounding terrain because world-tree placement fully excludes candidates inside each gully or dry-river `treeClearance` radius. Large channels can clear trees far beyond the channel floor, creating broad empty bands.

Goal: keep channel beds and near-water areas open, while restoring a natural tree density on outer valley slopes and shoulders.

## Success Criteria

- World trees remain blocked from water, lakes, channel beds, and immediate valley cores.
- Dendritic gullies, east-rim dry rivers, and lowland erosion gullies use a deterministic sparse transition instead of a full hard clear across the entire `treeClearance` band.
- Existing random forest, hand-placed forest groves, terrain carving, water rendering, grass, and collision behavior are unchanged.
- Tree placement remains deterministic for the same world coordinates and seed.

## Planned Changes

- Add world-tree valley clearance tuning constants near the existing world-tree configuration.
- Replace hard gully tree-clearance predicates with a shared valley clearance blocker:
  - hard block through the gully core and inner part of `treeClearance`
  - probabilistic keep/reject through the outer clearance band
  - full normal placement outside the original `treeClearance` radius
- Apply the shared blocker only in world-tree generation for:
  - newland dendritic gullies
  - east-rim dry rivers
  - lowland erosion gullies

## Test and Verification Plan

- Run `git diff --check`.
- Run `npm run build`.
- Run the local dev server and confirm world-tree build completes without runtime errors.
- Visually inspect new valley areas: channel beds stay readable, while outer slopes no longer appear broadly empty.

## Assumptions and Out of Scope

- Default direction is "clear near the bank, fill outer slopes."
- This does not add a new debug UI, density heatmap, new tree assets, or bespoke riverside shrub belts.
- If riverbanks still need stronger art direction later, add a separate shoreline vegetation pass.
