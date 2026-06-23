# 60-Face Reference Grass Model

## Context and Goal

Add a new low-poly model grass reference near the outdoor spawn so it can be compared in-game without replacing the current grass models.

## Success Criteria

- Existing grass GLBs remain unchanged.
- A new `public/models/grass/grass_clump_60_ref.glb` exists.
- The new reference GLB has fewer than 60 triangles; the exported file verifies at 57 triangles.
- The new reference grass is visible near the initial player spawn at `{ x: 0, z: 40 }`.
- Existing grass placement, variants, distant grass cards, and terrain models are unchanged.

## Planned Changes

- Extend `tools/blender/build_grass_clump.py` with a `grass_clump_60_ref` variant using fewer, wider, low-segment blades.
- Add a `--variant` export option so the reference model can be exported without overwriting current grass GLBs.
- Load the reference GLB in `src/scene/map.js` as a single unlit vertex-color grass instance near spawn.
- Add the reference GLB to runtime model preloading.

## Test and Verification Plan

- Run the Blender exporter for only `grass_clump_60_ref`.
- Re-import the exported GLB in Blender and confirm triangle count is below 60.
- Run `npm run build`.

## Assumptions and Out of Scope

- The triangle budget applies only to the new reference model.
- One reference clump near spawn is enough for visual comparison.
- Replacing existing grass models, changing grass density, and browser-based checks are out of scope.
