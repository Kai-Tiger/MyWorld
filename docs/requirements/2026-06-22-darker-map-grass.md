# Darker Map Grass

## Context and Goal

The map grass still reads too bright for the outdoor mood. Darken it further toward the muted gray-olive mood of `background_tree_09.glb`, while keeping the grass darker than that reference and preserving visible blade variation.

## Success Criteria

- Nearby `grass_clump_low.glb` model grass uses a darker near-black green vertex-color palette.
- Distant grass-card texture matches the nearby model grass palette.
- Small procedural canyon grass is darkened to the same mood.
- The brightest grass highlights stay subdued instead of reading as vivid green.
- Grass placement, density, wind motion, collision, and geometry remain unchanged.
- `npm run build` succeeds.

## Planned Changes

- Update `tools/blender/build_grass_clump.py` vertex colors and material preview color to a deeper muted gray-olive palette.
- Re-export `public/models/grass/grass_clump_low.glb`.
- Update `tools/generate_model_grass_card_texture.mjs` color constants to match the deeper grass palette.
- Regenerate `public/textures/generated/model_grass_card.png`.
- Change only the procedural canyon grass material color in `src/scene/map.js`.

## Test and Verification Plan

- Run the Blender grass export script.
- Run the grass-card texture generator.
- Run `npm run build`.

## Assumptions and Out of Scope

- "Model grass" refers to the local grass clump GLB and its distant card counterpart.
- `background_tree_09.glb` is a color mood reference, not an exact brightness target.
- The unused `model_grass_ground.png` stays unchanged.
- Tree leaves, terrain hill models, grass placement, and browser-based visual checks are out of scope.
