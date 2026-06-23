# Startup Model Loading Timeout

## Context and Goal

Refreshing the game can get stuck at `加载模型 x%`. Startup should only wait for models required to enter gameplay; decorative and outdoor scene assets must not block the first scene.

## Success Criteria

- The loading overlay no longer waits forever at `加载模型 x%`.
- Gameplay can start without waiting for player, enemy, NPC, weapon, or decorative model preloading.
- Player, enemy, NPC, and weapon models continue loading through their existing async loaders.
- Optional outdoor assets load through existing scene-specific async loaders.
- A slow or failed optional model logs a warning instead of blocking startup.

## Planned Changes

- Split runtime model preloading into an empty blocking phase and optional background assets.
- Add an 8 second timeout around each preload request.
- Do not start a bulk optional preload during startup; scene and entity code should load their own assets asynchronously.
- Update loading text to indicate that the startup phase no longer waits on every model.

## Test and Verification Plan

- Run `npm run build`.
- Refresh the local game and confirm loading advances past the core model phase.
- Confirm optional model failures produce warnings only.

## Assumptions and Out of Scope

- Fast entry into gameplay is more important than preloading any model before the first scene.
- A model may appear a few seconds after controls become available on a cold cache.
- This change does not resize or optimize large model files.
- This change does not alter scene-specific model fallback behavior.
