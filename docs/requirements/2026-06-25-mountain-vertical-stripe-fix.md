# Mountain Vertical Stripe Fix

## Context And Goal

Snow mountains show obvious regular vertical stripes from player-facing views. The stripes come from side-projected mountain rock texture sampling and overly continuous snow streak masks in the terrain shaders.

Goal: break up the vertical repetition while preserving cold gray exposed rock, snow coverage, and mountain depth.

## Success Criteria

- Near terrain mountains no longer show long, evenly spaced vertical white/gray texture bands.
- Distant proxy mountains no longer show large regular vertical bands.
- Snow still appears as broken alpine patches and short gullies, not as flat solid white.
- Terrain height, rivers, trees, player movement, and collision behavior are unchanged.
- Shader cache keys are bumped so browsers compile the updated materials.

## Planned Changes

- Add mountain-only warped triplanar sampling in `src/scene/map.js` for the shared mountain rock texture.
- Use the warped sampler for high alpine rock and steep riverbank mountain-rock tinting.
- Break up near terrain snow streak masks with additional cross-axis noise.
- Apply the same warped sampling and broken streak mask approach to distant proxy terrain.
- Apply the same treatment to the separate snow cliff skirt material.

## Test / Verification Plan

- Run `npm run build`.
- Start the local dev server and verify the app loads without shader compilation errors.
- Capture a mountain view similar to the reported screenshot and confirm the regular vertical striping is gone or substantially reduced.
- Check a closer mountain slope view and confirm rock/snow texture detail remains visible.

## Assumptions And Out Of Scope

- The fix is shader-only; no heightmap, Blender asset, or geometry regeneration is included.
- Natural irregular snow gullies and rock strata should remain.
- The existing `rock-texture-cool-gray-02.png` asset remains the mountain rock texture.
