# Reference Heightmap Sculpt Around -647, -650

## Context and Goal

Use the provided grayscale heightmap as a shape reference for the terrain around `(-647, -650)`. The area should read as a larger local mountain and drainage system with clear ridges and branching gullies, while keeping height differences suitable for the existing outdoor world.

## Success Criteria

- The terrain around `(-647, -650)` has a broader visible mountain/ridge structure.
- The sculpt affects roughly a `560m` core radius and fades out by about `680m`.
- Ridges and branching dry gullies resemble the reference heightmap's bright crest and dark drainage pattern.
- Existing lake, river, gully, water, tree, grass, and collision systems keep using the same sampling path.
- `npm run build` succeeds.

## Planned Changes

- Add a local procedural height modifier centered at `(-647, -650)`.
- Place it after the extended-region base terrain and before water/lake/channel carving.
- Use a broad dome, a long main ridge, several side ridges, and branching dry cuts.
- Keep maximum ridge lift moderate and fade the full patch smoothly into surrounding terrain.

## Test and Verification Plan

- Run `npm run build`.
- Inspect the height modifier order to confirm water and lake carving still run after the patch.
- Check from a high camera angle that the patch has readable large ridges without ring seams.
- Verify nearby water/lake depressions remain below the surrounding terrain.

## Assumptions and Out of Scope

- The reference image is used for terrain form, not imported directly as a full-world heightmap.
- The target is a medium-large local mountain system, not a snow-mountain-scale exterior wall.
- Materials, water shaders, tree density, and chunk loading are out of scope.
