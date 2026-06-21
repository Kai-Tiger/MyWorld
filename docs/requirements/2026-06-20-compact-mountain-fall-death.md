# Compact Mountain Map and Fall Death

## Context and Goal

The outdoor world is too large for the current core loop. Rework it into a compact mountain plateau that keeps the spawn area, bonfires, dense forest, old church ruins, castle approach, and castle entrance, while removing far peripheral space. The edge must read as a mountain cliff, not empty void.

## Success Criteria

- The playable outdoor area is visibly smaller and centered on the core route.
- Spawn, main bonfire, south bonfire, dense forest, old church ruins, enemies, and castle entrance remain reachable.
- The removed outer area no longer presents as a large empty plain or long remote canyon.
- Walking past the plateau edge lets the player fall beside textured rock/cliff surfaces.
- Falling below the cliff death threshold triggers the existing death message, fade, and checkpoint respawn.
- Castle entry and exit still place the player on valid outdoor terrain.

## Planned Changes

- Add shared outdoor mountain bounds and fall/death constants in `src/config/world.js`.
- Reduce the heightmap terrain size and remove far canyon generation from the outdoor map.
- Filter forest placement to the compact mountain bounds and drop canyon replacement forest content.
- Generate textured cliff skirt geometry around the mountain bounds using existing rock materials.
- Use a gameplay terrain-height wrapper outdoors so positions past the mountain bounds become falling space.
- Increase outdoor collision bounds so the old world boundary no longer behaves as an invisible wall before fall death.

## Test and Verification Plan

- Run `npm run build`.
- Start the dev server and verify spawn, forest, old church, south bonfire, and castle entrance are reachable.
- Walk off at least two plateau edges and confirm the player sees textured cliff/rock surfaces while falling.
- Confirm fall death respawns at the active checkpoint.
- Confirm castle entry and exit still work.

## Assumptions and Out of Scope

- Reuse existing rock and terrain textures; no new art assets are required.
- Remove the far canyon route rather than preserving it in shortened form.
- Do not redesign castle interior, combat, checkpoint, or UI death flow.
