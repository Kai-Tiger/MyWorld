# 4096 Heightmap Blender Terrain Source

## Context and Goal

Create a high-precision terrain source for Blender sculpting and visual development. The source heightmap should be a 4096 x 4096 16-bit grayscale PNG, used to build a 2048m x 2048m alpine valley terrain inspired by the provided mountain forest reference.

## Success Criteria

- A 4096 x 4096 16-bit grayscale heightmap exists at `public/heightmaps/large_alpine_height_4096.png`.
- A Blender source scene exists at `assets/blender/large_alpine_terrain.blend`.
- The terrain represents a large alpine valley with distant snow mountains, a central river/lake system, forested slopes, exposed rock, and snowline material regions.
- The Blender scene stays editable by using the 4096 heightmap as source data and a lower-density preview mesh, rather than a full 4096 x 4096 vertex grid.
- A preview render exists at `previews/large_alpine_terrain.png`.

## Planned Changes

- Add `tools/blender/build_large_alpine_heightmap_terrain.py`.
- Add `terrain:alpine:heightmap` to `package.json`.
- Generate the 4096 heightmap, Blender scene, and preview image from the new script.
- Do not change the existing runtime terrain, current main heightmap, player collision, or map loading code.

## Test/Verification Plan

- Run `npm run terrain:alpine:heightmap`.
- Build the Blender scene by running Blender directly with `--python-expr` and `--scene-only`; avoid npm wrapping for this step because Blender 5.1.2 crashes when launched from npm in this environment.
- Confirm the heightmap file reports `PNG image data, 4096 x 4096, 16-bit grayscale`.
- Confirm the `.blend` and preview PNG are generated.
- Inspect the Blender scene or preview image for the intended large-scale terrain composition.

## Assumptions and Out of Scope

- The source terrain area is 2048m x 2048m.
- The source heightmap resolution is 4096 x 4096, which gives roughly 0.5m per pixel.
- This task creates a Blender sculpting source only; it does not integrate the 4096 heightmap into the game runtime.
- No new external assets are downloaded.
