# 1600m Chunked Snow Mountain River World

## Context and Goal

Expand the outdoor world to a 1600m scale while keeping performance stable through chunked terrain and chunked visual layers. The visual target is `~/Downloads/hero.jpg`: layered river valley, flowing water with foam and splashes, forested slopes, and a large snow mountain that can be reached and climbed.

## Success Criteria

- `WORLD_SIZE` is 1600 and outdoor collision/camera/fog ranges support the larger world.
- Terrain is rendered as chunks using one global height function, so chunk borders do not create holes or height seams.
- A large climbable snow mountain exists in the far/northwest world.
- A continuous river cuts from the snow mountain toward lower terrain, with animated flow, foam, and splash particles.
- Player movement is affected by river current, but current displacement still respects collision and height stepping.
- Existing critical areas remain usable: spawn, castle entrance, mine cave, old church, campfires, NPCs, and enemy areas.
- Verification includes `npm run build` and browser visual checks.

## Planned Changes

- Add chunk support to `createHeightmapTerrain` with deterministic world-space sampling.
- Expand world constants in `src/config/world.js`.
- Add large-scale height modifiers for rolling terrain, snow mountain, and hero-style river valley.
- Add a river system in `src/scene/map.js` with `update` and `sampleRiver`.
- Wire river sampling into the outdoor main loop and apply bounded current push through collision checks.
- Keep terrain LOD disabled for the first version to avoid chunk boundary cracks.

## Test/Verification Plan

- Run `npm run build`.
- Start the dev server and inspect in browser.
- Verify chunk borders while moving, snow mountain visibility and climbability, river flow/foam/splashes, current push, and existing key area reachability.

## Assumptions and Out of Scope

- No new downloaded assets.
- Snow mountain is explorable but does not add quests, enemies, pickups, or interiors.
- Terrain chunking applies to terrain first; decorative chunk loading can be refined after the core world is visually correct.
- Initial chunked terrain uses uniform chunk resolution, not LOD.
