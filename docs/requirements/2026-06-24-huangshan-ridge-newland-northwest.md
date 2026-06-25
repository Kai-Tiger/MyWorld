# Huangshan Ridge Newland Northwest

## Context and Goal
The mountain near `(-990, 700)` should become a Huangshan-style granite ridge. It should be a medium-high, narrow, walkable crest with steep shoulders, not a broad platform.

## Success Criteria
- The ridge covers the `(-990, 700)` area.
- The crest reads as a narrow continuous ridge with a walkable top.
- The ridge rises around `80m` over nearby hills.
- The shape remains local to the northwest newland area and does not alter old snow mountains, rivers, water, trees, or player movement.

## Planned Changes
- Add a local `huangshanNewlandRidgeLift(x, z, crag)` helper in `src/scene/map.js`.
- Apply it from `applyExtendedRegionHeight()`.
- Keep the helper deterministic and bounded near `(-990, 700)`.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that the helper is only called from `applyExtendedRegionHeight()`.

## Assumptions and Out of Scope
- "Huangshan style" means a granite-like narrow ridge with steep shoulders and limited rocky knobs.
- No new mesh, material, river, vegetation, or gameplay changes are in scope.
