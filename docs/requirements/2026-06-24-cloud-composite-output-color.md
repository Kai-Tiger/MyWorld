# Cloud Composite Output Color

## Context and Goal

Outdoor lighting appears too dark after the cloud render path moved to an offscreen scene render target and custom composite shader. The fix should restore the cloud path's output transform to match the normal Three.js renderer path without changing cloud shape, density, world lighting, or unrelated gameplay work.

## Success Criteria

- Cloud-enabled outdoor rendering applies ACES tone mapping with the same exposure behavior as Three.js `ACESFilmicToneMapping`.
- The composite shader uses Three.js tone mapping and color space shader chunks instead of redefining built-in output functions.
- Non-cloud rendering paths remain unchanged.
- No changes are made to cloud density/shape parameters or `OUTDOOR_LIGHTING`.

## Planned Changes

- Update the cloud composite shader in `src/scene/sky.js` to output linear HDR and then use `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`.
- Mark the composite material as `toneMapped: true` so Three.js injects the active renderer tone mapping.
- Keep `src/main.js` rendering flow the same: render the scene to `sceneRT` with `NoToneMapping`, restore the previous renderer tone mapping, then composite clouds.
- Keep `try/finally` around the temporary renderer state changes.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions and Out of Scope

- The brightness regression is caused by the custom cloud composite output transform, not by changed lighting values.
- The black-screen regression is caused by redefining Three.js built-in shader output functions in a non-raw `ShaderMaterial`.
- Cloud appearance tuning, TAA work, and world lighting changes are out of scope for this fix.
