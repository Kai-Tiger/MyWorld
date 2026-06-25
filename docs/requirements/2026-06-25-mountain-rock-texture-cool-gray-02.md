# Mountain Rock Texture Cool Gray 02

## Context And Goal

The current snow mountain surface reads too white and smooth from player view. Replace the shared mountain rock texture with the provided cool gray rock texture so all runtime mountain shading paths show darker stratified rock under the snow.

## Success Criteria

- `public/textures/generated/rock-texture-cool-gray-02.png` is available as a runtime static asset.
- Near heightmap mountains, snow mountain cliff skirts, and distant terrain proxy mountains use the new texture through the shared mountain rock texture constant.
- Snow distribution, terrain height, rivers, trees, player movement, and gameplay logic remain unchanged.
- Shader cache keys are bumped so browsers compile the updated terrain materials.

## Planned Changes

- Copy the provided generated texture into `public/textures/generated/`.
- Point `MOUNTAIN_ROCK_TEXTURE_URL` in `src/scene/map.js` at `rock-texture-cool-gray-02.png`.
- Bump the main terrain and distant proxy terrain material cache keys.

## Test / Verification Plan

- Run `npm run build`.
- Run the app locally and verify the new texture loads without a 404.
- Capture a mountain view screenshot and confirm the white mountain surface is broken up by gray rock texture.

## Assumptions And Out Of Scope

- The active game uses `createMap()` from `src/scene/map.js`; the legacy `src/scene/terrain.js` mountain GLB references are not part of the current runtime path.
- The new PNG is used as diffuse/color only; no normal, roughness, or AO maps are added.
- No tuning to snow coverage, mountain geometry, lighting, fog, or camera framing is included.
