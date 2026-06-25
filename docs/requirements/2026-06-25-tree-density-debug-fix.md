# Tree Density Debug Fix

## Context and Goal

The performance debug panel's `Tree Density` slider appears to have no visual effect. The control currently only affects procedural `world_tree_*` instances, and existing LOD skip logic can prevent updated density from being applied when the player/cell tier does not change.

## Success Criteria

- Moving the `Tree Density` slider rewrites world-tree instance counts without requiring player movement.
- `Tree Density = 0` hides procedural `world_tree_*` trunks/crowns.
- The hover text clearly states that the control does not affect hand-placed `forest_grove_*` trees.
- Grass debug controls are unchanged.

## Planned Changes

- Add a world-tree density version counter.
- Include density version in the world-tree visibility skip condition.
- Store the applied density version on each world-tree cell.
- Update panel hover text for `Tree Density`.

## Test/Verification Plan

- Run `npm run build`.
- Set `Tree Density` to `0` and confirm `wtTris` drops toward `0`.
- Confirm hand-placed forest grove trees remain visible.

## Assumptions and Out of Scope

- This fix only controls procedural world trees.
- Hand-placed forest grove trees need a separate debug control if they should also be toggled.
