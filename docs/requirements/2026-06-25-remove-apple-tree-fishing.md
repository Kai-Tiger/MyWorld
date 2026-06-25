# Remove Apple Tree And Fishing Logic

## Context And Goal

The project still contained a standalone apple tree module and a complete fishing gameplay path. The goal is to remove both features from runtime code so they are no longer available, rendered, or maintained.

## Success Criteria

- No source code references remain for apple tree creation or fishing gameplay.
- Fishing UI, scene state, rod rendering, timers, and fish inventory rewards are removed.
- The `fish` pickup definition is removed because fishing was its only source.
- Build passes after removal.

## Planned Changes

- Delete the unused apple tree scene module.
- Delete the fishing rod scene module.
- Remove fishing import, state, scene branch, death cleanup, and outdoor UI cleanup from `src/main.js`.
- Remove fishing button/result CSS and UI methods from `src/ui.js`.
- Remove `fish` from pickup definitions.

## Test And Verification Plan

- Search `src` for apple/fishing identifiers and confirm no runtime matches remain.
- Run `npm run build`.

## Assumptions

- Historical docs and conversation notes may still mention old fishing/apple work; those are not runtime logic and are left intact.
- No other gameplay path should produce or display `fish` after fishing is removed.

## Out Of Scope

- Refactoring unrelated inventory, pickup, scene, or UI code.
- Removing historical documentation references.
