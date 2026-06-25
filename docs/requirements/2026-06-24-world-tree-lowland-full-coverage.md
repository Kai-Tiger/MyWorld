# World Tree Lowland Full Coverage

## Context and Goal
World trees should cover lowland and hill areas continuously, while leaving both riverbanks open. The confirmed riverbank no-tree buffer is `6m`.

## Success Criteria
- Lowland and hill world-tree placement no longer creates broad cluster-noise clearings.
- World-tree placement applies a deterministic 20% thinning pass.
- Riverbanks still keep a `6m` tree-free buffer.
- Existing snowline, steep-slope, structure, handmade-grove, and lake avoidance remains active.

## Planned Changes
- Disable the world-tree cluster clearing guard.
- Set the world-tree thinning guard to 20%.
- Keep `WORLD_TREE_RIVER_HANDOFF = 6`.
- Leave world-tree instancing, LOD, build budget, and under-tree grass behavior unchanged.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that cluster clearings remain disabled while the 20% thinning, river, slope, snowline, and structure guards remain.

## Assumptions and Out of Scope
- "All places" means lowlands and hills, not snowline/high mountain or steep cliffs.
- This only changes world-tree distribution, not grass, handmade forest placements, river geometry, or terrain.
