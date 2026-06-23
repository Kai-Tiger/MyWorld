# Water Surface Height Follows Channel

## Context and Goal

After steep channel carving, river meshes can appear to float because the visible water still uses the old analytical `waterY` instead of the final carved terrain height.

Goal: make all visible water surfaces, splash positions, and runtime water sampling derive from the final river channel terrain.

## Success Criteria

- Water mesh vertices no longer hardcode `sample.waterY + 0.08`.
- Main river, branches, gullies, and center-west stream derive visible surface height from `getGroundHeight`.
- `sampleRiver()` returns actual surface `waterY`, `depth`, and `inWater`.
- Splash positions use the same actual surface height.

## Planned Changes

- Add water depth defaults per waterway type.
- Add helpers that convert analytical river samples to final visible water samples.
- Pass water surface callbacks into river strip geometry construction.
- Update runtime river sampling to use final surface height.

## Test/Verification Plan

- Run `npm run build`.
- Confirm all river strip geometry calls pass a final surface height callback.
- Confirm runtime `sampleRiver()` depth is based on final surface height.

## Assumptions and Out of Scope

- River path still comes from the existing point arrays.
- This is not a physical fluid solver.
- Do not change river colors, foam, channel slope, or chunk loading in this pass.
