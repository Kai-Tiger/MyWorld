# World Tree Render Budget Stage 2

## Context and Goal

After the first world-tree render budget pass, the same stutter area dropped from about `854 calls / 6.54M tris` to about `589 calls / 4.87M tris`. CPU map work is now around `2ms`, so the remaining target is scene render object count and world-tree triangle count.

## Success Criteria

- World-tree instance reduction starts outside `100m`.
- SceneRT calls and triangles drop materially at the same stutter area.
- Trees within `100m` keep their existing density.
- Nearby quality remains acceptable, while distant forest may become visibly thinner.
- Perf logs identify whether remaining SceneRT cost is still world trees or another object class.

## Planned Changes

- Keep `WORLD_TREE_LOD_NEAR` at `130m`.
- Reduce `WORLD_TREE_LOD_MID` from `320m` to `240m`.
- Reduce `WORLD_TREE_COVERAGE` from `900m` to `620m`.
- Reduce `WORLD_TREE_INSTANCE_FULL_DIST` from `280m` to `100m`.
- Reduce `WORLD_TREE_INSTANCE_FAR_KEEP` from `0.45` to `0.25`.
- Add a `?perf=1` SceneRT object classification marker for world trees, terrain, grass, water, and other visible renderable meshes.

## Test/Verification Plan

- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1&perfSpike=16.7` in the same stutter area.
- Verify `render.sceneRT.info.calls` moves toward `350` or below.
- Verify `render.sceneRT.info.tris` moves toward `2.5M` or below.
- Check the new classification marker to confirm the remaining dominant category.

## Assumptions and Out of Scope

- This pass prioritizes movement frame rate over distant forest fullness.
- This pass does not change clouds, sky color, DPR, player movement, collision, or terrain height.
