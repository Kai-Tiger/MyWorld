# Online Leaf and Branch Ground Debris

## Context and Goal

Add newly downloaded online textures for fallen leaves and branch debris to the outdoor ground so forest and ruin areas have stronger surface detail.

## Success Criteria

- New Poly Haven CC0 textures are stored under `public/textures/ground_debris/polyhaven/`.
- Outdoor ground has non-colliding visual leaf and wood debris patches.
- Debris is concentrated around forest, ruin, and north grove areas, not over key clearings.
- Existing terrain, collision, pickup, grass, and forest logic continue working.
- `npm run build` passes.

## Planned Changes

- Add source documentation for downloaded Poly Haven assets.
- Add an instanced ground debris layer in `src/scene/map.js`.
- Use horizontal textured patches slightly above terrain height.
- Keep debris visual-only: no collisions, no interaction, no gameplay changes.

## Test and Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions and Out of Scope

- Use 1K Poly Haven JPG texture maps for build size and runtime cost.
- Do not modify the base terrain material.
- Do not add pickup items, physics branches, or new collision geometry.
