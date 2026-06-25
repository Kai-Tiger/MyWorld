# World Tree Render Budget

## Context and Goal

Movement stutter logs show the largest spikes come from scene rendering, not cloud raymarching: one captured frame rendered about 854 calls and 6.5M triangles inside `render.sceneRT`. The goal is to reduce distant world-tree draw calls and triangle count while keeping nearby trees visually intact.

## Success Criteria

- Nearby world trees within about 130m keep their existing quality tier.
- Distant world-tree coverage and instance counts are reduced enough to materially lower `render.sceneRT` calls and triangles.
- Terrain and meadow grass generation budgets no longer stack into about 10ms map-update spikes.
- Default sky, player movement, collision, and terrain height behavior are unchanged.

## Planned Changes

- Keep `WORLD_TREE_LOD_NEAR` at `130m`.
- Reduce world-tree trunk mid tier from `520m` to `320m`.
- Reduce world-tree crown coverage from `1800m` to `900m`.
- Start world-tree far instance reduction outside `280m`.
- Keep only `45%` of far world-tree instances.
- Reduce terrain incremental build budget from `5ms` to `3ms`.
- Reduce meadow grass scan budget from `1.5ms` to `1.0ms`.
- Reduce meadow grass queue budget from `3.0ms` to `1.5ms`.

## Test/Verification Plan

- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1&perfSpike=16.7` at the same stutter area.
- Verify `render.sceneRT.info.calls` drops substantially from about `854`.
- Verify `render.sceneRT.info.tris` drops substantially from about `6.5M`.
- Verify near trees still look dense within about `130m`.

## Assumptions and Out of Scope

- This pass accepts a thinner distant forest to protect movement frame rate.
- This pass does not change cloud rendering, sky color, default DPR, player movement, or terrain collision.
- If the same area still reports high calls/tris after this change, the next pass should identify non-world-tree contributors.
