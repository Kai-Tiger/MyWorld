# River Bank Rock Texture

## Context And Goal

Use the provided cool gray rock texture on steep river banks so carved channel sides read as rock cliffs instead of generic wet mud or procedural green-gray rock.

## Success Criteria

- Steep banks beside rivers and streams use `public/textures/generated/rock-texture-cool-gray-01.png`.
- Flat shorelines and wet floodplains keep the existing mud, clay, and moss colors.
- Rock texture uses triplanar projection to avoid vertical stretching on 45-degree banks.
- Existing water geometry, river paths, terrain height, and distant mountain materials are unchanged.
- Verify with `npm run build`.

## Planned Changes

- Reuse the existing `MOUNTAIN_ROCK_TEXTURE_URL` and `uMountainRockMap`.
- Add a river-bank texture scale uniform for tighter bank detail.
- Replace the steep river-bank color mix with a textured gray rock mix.
- Add detail normal and roughness variation only where the steep river-bank rock mask is active.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions And Out Of Scope

- The provided PNG is used as a diffuse/color texture only.
- This change does not alter river width, water animation, terrain geometry, or tree placement.
