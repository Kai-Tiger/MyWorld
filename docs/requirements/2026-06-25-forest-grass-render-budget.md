# Forest Grass Render Budget

## Context and Goal

Movement through forest and grassland still spikes around `29ms` with about `500 calls / 4.9M tris`. Previous terrain and world-tree work reduced CPU map cost, so this pass targets visible grass instances and remaining distant world-tree triangles.

## Success Criteria

- Grass LOD switches to low geometry earlier and hides sooner.
- Visible grass instance caps prevent a single grass mesh from contributing too many triangles.
- World-tree triangles beyond 100m are reduced further.
- Perf classification reports grass, world trees, terrain, water, other, and total estimated SceneRT costs.

## Planned Changes

- Set grass near LOD distance to `35m`.
- Set grass sparse distance to `70m`.
- Set grass hide distance to `90m`.
- Set grass far keep ratio to `0.04`.
- Set grass visible capacity to `18000`.
- Set world-tree coverage to `480m`.
- Set world-tree far keep ratio to `0.15`.
- Classify `world_tree_grass_*` as grass in `render.sceneRT.objects`.
- Add total calls and triangles to `render.sceneRT.objects`.

## Test/Verification Plan

- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1&perfSpike=16.7` in the same forest/grass area.
- Verify `render.sceneRT.info.tris` drops from about `4.9M` toward `2.5M` or lower.
- Verify `render.sceneRT.objects` shows lower `grassTris` and `wtTris`.
- Visually confirm nearby grass remains dense enough inside about `35m`.

## Assumptions and Out of Scope

- This pass accepts earlier grass thinning beyond 35m.
- This pass does not change clouds, sky color, default DPR, player movement, collision, or terrain height.
