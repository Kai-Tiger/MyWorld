# Debug Disable Water Effects

## Context And Goal

The performance debug panel needs a live switch that can hide all water visuals in one click. This isolates water rendering and water animation cost without changing gameplay water sampling.

## Success Criteria

- The `PERF` panel has a `Disable Water FX` live checkbox.
- Enabling it hides the unified water mesh and active water splash sprites.
- Water material time updates and splash generation are skipped while disabled.
- River/lake sampling, in-water state, water current push, terrain, and collision remain unchanged.
- The setting persists through localStorage and is cleared by `Reset Debug`.

## Planned Changes

- Add a water visual debug flag and setter in `src/scene/map.js`.
- Return `setDebugWaterEffectsDisabled` from `createMap()`.
- Add a live checkbox in `src/main.js` using localStorage key `perfDisableWaterEffects`.
- Add the new key to the debug reset list.

## Test / Verification Plan

- Run `npm run build`.
- Open the `PERF` panel and verify the new checkbox appears.
- Toggle it on and confirm water surfaces and splash sprites disappear.
- Toggle it off and confirm water surfaces animate again.
- Verify player in-water/current behavior still works.
- Refresh with the setting enabled and confirm it remains active.
- Use `Reset Debug` and confirm water visuals return.

## Assumptions And Out Of Scope

- This switch is debug-only and does not add a gameplay option.
- The switch only disables visual water effects, not river physics or water sampling.
- No water shader simplification or quality levels are added.
