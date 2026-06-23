# Terrain Chunk Performance

## Context and Goal

The 1600m outdoor world now has heavier river valley, branch, gully, and mountain height modifiers. Startup can linger on the pre-render look sweep, and movement near river areas can stutter when terrain chunks are generated synchronously.

Goal: keep the pre-render look sweep, but make terrain generation incremental and reduce unnecessary river/gully sampling work.

## Success Criteria

- The pre-render look sweep remains in place.
- Startup no longer builds all distant terrain proxies and all nearby real chunks in one synchronous burst.
- Crossing chunk boundaries does not synchronously build the full preload radius.
- River and gully height modifiers skip branches/gullies that cannot affect the sampled point.
- Terrain chunks do not leave visible holes near the player while pending chunks are queued.

## Planned Changes

- Convert real terrain chunk generation to a prioritized queue with a small per-update build budget.
- Convert distant proxy generation to a lower-priority queue with a separate per-update budget.
- Keep missing real chunks covered by proxy chunks when possible until the real chunk is built.
- Add precomputed influence bounds for river branches and erosion gullies.
- Use those bounds in branch/gully height and runtime river sampling paths.

## Test/Verification Plan

- Run `npm run build`.
- Confirm the startup code still calls the pre-render look sweep.
- Confirm chunk generation no longer uses startup-wide synchronous proxy construction.
- Confirm branch/gully sampling has bounds filters before expensive path sampling.

## Assumptions and Out of Scope

- Do not remove the pre-render look sweep.
- Do not change world size, river layout, water rendering, snow mountains, or grass density.
- Do not address static model draw calls in this pass.
