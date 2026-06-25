# Movement Stutter Diagnostics

## Context and Goal

Player movement still has visible frame drops after terrain build work was split across frames. The next step is diagnostic, not a default quality downgrade: identify whether spikes come from CPU updates, grass/tree LOD, terrain, shadows, clouds, scene render target rendering, or pixel fill cost.

## Success Criteria

- `?perf=1` reports single-frame spike details when a frame exceeds the configured threshold.
- Spike logs include movement/render context and the slowest per-frame sections.
- Diagnostic URL flags can isolate cloud rendering and pixel ratio cost without changing default gameplay visuals.
- Default behavior is unchanged when diagnostic flags are absent.

## Planned Changes

- Extend the perf monitor with per-frame section tracking and spike logging.
- Add `perfSpike` URL/localStorage threshold support, defaulting to `33ms`.
- Add debug-only render context: movement state, player speed, cloud state, cloud quality, pixel ratio, and shadow auto-update.
- Add `perfNoClouds=1` to force direct outdoor rendering for diagnosis.
- Add `perfLowDpr=1` to force a lower diagnostic pixel ratio for diagnosis.
- Record sceneRT render call and triangle deltas around the scene render target pass.

## Test/Verification Plan

- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1&perfSpike=16.7`, move for 10 seconds, and confirm `[perf-spike]` logs include section breakdowns.
- Compare with `?perf=1&perfSpike=16.7&perfNoClouds=1`.
- Compare with `?perf=1&perfSpike=16.7&perfLowDpr=1`.

## Assumptions and Out of Scope

- Console logging is acceptable only behind perf/debug flags.
- This pass does not change default cloud quality, grass density, tree density, or terrain LOD.
- Final quality/performance tradeoffs are out of scope until the diagnostic data identifies the bottleneck.
