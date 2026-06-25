# Map Configuration Comments

## Context And Goal

`src/scene/map.js` contains many top-level map configuration constants for terrain, grass, trees, rivers, lakes, caves, and generated landmarks. The goal is to make those configuration points understandable in-place so future tuning can see what each value controls and what changing it affects.

## Success Criteria

- Important top-level configurable constants in `src/scene/map.js` have concise comments.
- Dense data arrays use group-level schema comments instead of noisy per-row comments.
- Runtime caches, derived lookup tables, and temporary objects are either left alone or labeled as derived/internal when their purpose is otherwise unclear.
- No configuration values or runtime logic are changed as part of this documentation pass.

## Planned Changes

- Add a short map configuration overview near the top of `src/scene/map.js`.
- Add inline comments for scalar/path/density/distance/budget constants.
- Add group-level comments for model variant arrays, placement arrays, river/channel arrays, lake arrays, mountain arrays, and terrain shaping groups.
- Add clarifying comments around derived bounds and LOD helper constants where they may look like tunable configuration.

## Test And Verification Plan

- Run `npm run build` to verify comments did not introduce syntax errors.
- Review the diff to confirm the change is documentation-only.

## Assumptions

- "配置项" means top-level map tuning constants and grouped data tables, not local variables inside functions.
- Large arrays should be documented by schema and effect rather than by repeating the same comment on every row.

## Out Of Scope

- Changing grass, tree, terrain, or water behavior.
- Refactoring `map.js` into smaller modules.
- Renaming constants or moving configuration to external files.
