# Grass Wind Debug Toggle

## Context and Goal

Grass movement uses a vertex shader wind offset. To isolate whether the wind shader itself contributes to forest/grass movement stutter, add a debug-only switch that keeps grass count and LOD unchanged while disabling the wind deformation.

## Success Criteria

- Default grass still moves.
- `?perfNoGrassWind=1` makes model grass stay still.
- Grass instance count, LOD, visibility, and matrix updates are unchanged by the toggle.
- `npm run build` passes.

## Planned Changes

- Add a grass wind enabled uniform to the spawn grass material shader.
- Set the uniform from `perfNoGrassWind`.
- Guard the shader wind offset behind the uniform.
- Keep `map.grassWind` uniform updates unchanged.

## Test/Verification Plan

- Run `npm run build`.
- Compare the same forest/grass area with and without `?perfNoGrassWind=1`.
- If frame time improves with the flag, grass wind shader cost is meaningful.
- If frame time is similar, the main cost is grass/tree count and triangles.

## Assumptions and Out of Scope

- This is a diagnostic switch only.
- This does not change grass placement, LOD, density, trees, clouds, terrain, player movement, or collision.
