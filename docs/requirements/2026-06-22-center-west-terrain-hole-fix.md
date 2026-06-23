# Center West Terrain Hole Fix

## Context and Goal

The area around `(-100, 25)` is generated as a broad low flat basin, with sampled terrain near `-13m`. When the player moves there from the central playable area, the player appears to run above the visible ground instead of naturally following terrain.

## Success Criteria

- Terrain around `x=-140..-60`, `z=-15..65` is no longer a broad `-10m` to `-16m` flat basin.
- The player can move through `(-100, 25)` without appearing to float above the terrain.
- Chunk loading, river rendering, snow mountains, and the mine/castle areas remain unchanged.

## Planned Changes

- Add a local terrain recovery height modifier for the center-west problem area.
- Place the modifier after large-world height shaping and before river carving.
- Improve grounded player descent on ordinary terrain so steep-but-valid terrain changes do not leave the player visually suspended.

## Test and Verification Plan

- Run `npm run build`.
- In browser, sample a grid around `(-100, 25)` and confirm the height range is natural and not a deep flat basin.
- Teleport or move the player through `(-100, 25)` and verify the player follows the terrain.

## Assumptions and Out of Scope

- The old low basin around `(-100, 25)` is not required for gameplay.
- This change does not add vegetation or redesign the river/snow mountain visuals.
