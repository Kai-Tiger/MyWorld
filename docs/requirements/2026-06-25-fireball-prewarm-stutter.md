# Fireball Prewarm Stutter Fix

## Context and Goal

The first `E` fireball cast can still stutter because startup warmup does not fully wait for spell textures, the player throw-magic action, and the first fireball burst path. Restore reliable spell warmup so the first cast and first impact do not create expensive runtime work.

## Success Criteria

- Startup waits for fireball VFX textures and shader compilation before gameplay begins.
- Startup waits for the player throw-magic action to exist and be warmed.
- Fireball impact burst objects are pooled and prewarmed instead of first-created on impact.
- First `E` cast and first fireball impact do not cause obvious frame spikes.

## Planned Changes

- Make `SpellSystem.warmup(renderer, camera)` asynchronous and texture-load aware.
- Add a small fireball burst pool and return finished bursts to that pool.
- Prewarm one offscreen projectile and one offscreen burst during startup compilation.
- Add a player throw-magic async warmup method that resolves after the action is created.
- Await both spell and player warmup in `startGame()`.

## Test and Verification Plan

- Run `npm run build`.
- Start the game, press `E` once, and verify there is no obvious first-cast pause.
- Let the first fireball hit terrain or an NPC and verify there is no obvious first-impact pause.
- Check console for new preload or warmup errors.

## Assumptions and Out of Scope

- It is acceptable for the loading overlay to remain on screen slightly longer during spell warmup.
- Fireball damage, timing, visuals, input, and MP/cooldown behavior remain unchanged.
- Audio unlock behavior remains user-gesture based and is not changed.
