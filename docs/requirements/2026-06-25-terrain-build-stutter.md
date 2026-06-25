# Terrain Build Stutter

## Context and Goal
Performance profiling shows outdoor stutter is dominated by synchronous terrain construction. `terrain.buildChunk` can take hundreds of milliseconds and `terrain.buildProxy` can hold tens of milliseconds per frame. The goal is to keep terrain visual quality while splitting terrain construction into small per-frame work.

## Success Criteria
- No single terrain chunk or proxy build blocks a frame with a large synchronous task.
- Terrain build work is advanced by a per-frame time budget.
- Existing terrain height queries, collision height, water placement, grass placement, and tree placement continue to use the same height function.
- No terrain quality constants are reduced in this pass.
- `?perf=1` reports terrain work as smaller `terrain.chunk.*` / `terrain.proxy.*` slices instead of `terrain.buildChunk` spikes.

## Planned Changes
- Replace full synchronous `buildChunk` and `buildDistantProxyChunk` queue processing with incremental terrain build tasks.
- Split each task into geometry creation, batched height writes, batched normal writes, hole-mask/bounds finalization, and scene insertion.
- Cache per-task vertex heights so normal generation can reuse neighboring vertex heights instead of re-running the full height stack for every normal sample.
- Run terrain build tasks under a small total per-frame time budget, prioritizing active chunks over distant proxies.
- Cancel unfinished chunk tasks that leave the desired active/preload range.

## Test/Verification Plan
- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1` and verify terrain chunk/proxy build spikes are gone or materially reduced.
- Move across terrain chunk boundaries and confirm terrain still appears, removes, and proxies toggle correctly.
- Check that water, grass, tree placement, and player collision still line up with terrain.

## Assumptions and Out of Scope
- This pass targets main-thread build spikes, not cloud/GPU cost.
- Web Worker terrain generation is out of scope unless incremental main-thread construction is insufficient.
- Terrain resolution and visual quality remain unchanged.
