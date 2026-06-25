# Outdoor Blender Landmark Structures

## Context and Goal

The outdoor map needs more vertical Dark Souls-style landmark structure: uneven rock masses, broken bridge routes, and lower paths that pass beneath upper walkable areas.

The existing heightmap works for single-layer terrain, but bridge-over-road layouts need separate visual meshes and explicit walkable collision surfaces. The first implementation should add a small set of authored outdoor landmarks without replacing the base terrain, forest, castle, mine cave, or grass systems.

## Success Criteria

- A Blender source scene exists at `assets/blender/outdoor_landmarks.blend`.
- A manifest exists at `public/models/outdoor_landmarks/outdoor-landmarks-manifest.json`.
- The manifest adds bridge surfaces, ramps, and blocking shapes to the existing collision system.
- The first pass includes three landmarks:
  - a broken stone bridge with a road below it,
  - a natural ruined rock gate,
  - a ruined terraced outcrop with short ramps and platforms.
- The bridge keeps upper and lower routes distinct instead of baking the bridge into the heightmap.
- `npm run build` succeeds.

## Planned Changes

- Add `tools/blender/build_outdoor_landmarks.py` to create and export an outdoor landmark scene.
- Use `VIS_*` mesh names for visible landmark geometry.
- Use `COL_BOX_*`, `COL_SURFACE_*`, and `COL_RAMP_*` objects for simplified gameplay collision.
- Use `SOCKET_*` objects and landmark metadata for future placement hooks.
- Fetch `/models/outdoor_landmarks/outdoor-landmarks-manifest.json` and append its colliders to the outdoor `collidables` array.

## Test and Verification Plan

- Run the Blender landmark build script from the project root.
- Run `npm run build`.
- Static-check that the manifest contains surfaces, ramps, boxes, sockets, and three landmark entries.

## Assumptions and Out of Scope

- The base outdoor heightmap stays in place.
- Complex mesh physics is out of scope; collision uses simple boxes, surfaces, and ramps.
- Browser and Playwright verification are out of scope unless explicitly requested.
- Enemy, pickup, campfire, and quest placement on the new landmarks is out of scope for this first pass.
