# Performance Investigation

## Context and Goal
Outdoor movement and camera rotation can stutter badly. The goal is to identify the real CPU/GPU hotspots before reducing visual quality, with profiling focused on the current Mac development target.

## Success Criteria
- Performance profiling is opt-in and disabled by default.
- `?perf=1` or `localStorage.perf = "1"` prints frame-time summaries and subsystem timings.
- The report includes renderer draw-call/triangle metrics and active scene/render-quality context.
- DEV-only river diagnostics do not run unless explicitly requested.
- The implementation does not change gameplay, rendering quality, or LOD behavior when profiling is disabled.

## Planned Changes
- Add a lightweight profiler that records frame time, named section durations, max spikes, and basic renderer metrics.
- Instrument the outdoor main loop around map update, player, NPC, spells, UI, sky, and render phases.
- Instrument map update internals around terrain chunk work, grass queues/LOD, world-tree build/visibility, water systems, and campfire animation.
- Gate expensive river diagnostics/probes behind `?riverDebug=1` or `localStorage.riverDebug = "1"`.
- Expose profiler controls under `window.__MY_GAME_DEBUG__.perf`.

## Test/Verification Plan
- Run `npm run build`.
- Open `http://127.0.0.1:3000/?perf=1` and verify `[perf]` summaries appear without console errors.
- Confirm `http://127.0.0.1:3000/` does not print perf summaries by default.
- Use profiler output to rank hotspots before making any quality/performance tradeoffs.

## Assumptions and Out of Scope
- This pass adds instrumentation and disables accidental DEV diagnostics; it does not lower cloud, shadow, grass, or tree quality.
- Detailed fixes should be based on the collected profiler output.
