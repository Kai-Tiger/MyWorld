# Player Material Brightness

## Context And Goal

The player model reads too dark in game. Brighten only the player model material without changing global lighting, terrain, water, grass, sky, NPCs, or separate weapon GLB assets.

## Success Criteria

- Player FBX material appears brighter in game.
- Scene lighting and non-player materials are unchanged.
- Brightness can be tuned from one config value.
- Materials are cloned before modification so shared cached assets are not polluted.

## Planned Changes

- Add `PLAYER_MATERIAL_BRIGHTNESS` in `src/config/lighting.js`.
- Apply a player-only material shader brightness multiplier after loading the player FBX.
- Leave global exposure and light intensities untouched.

## Test/Verification Plan

- Run `npm run build`.
- Check the player visually in game and confirm only the player is brighter.

## Assumptions And Out Of Scope

- This applies only to the player FBX model.
- NPCs, monsters, terrain, water, grass, sky, and standalone weapon GLB models are out of scope.
