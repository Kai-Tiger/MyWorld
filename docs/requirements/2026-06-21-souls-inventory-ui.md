# Souls Inventory UI

## Context and Goal

Replace the current compact bag modal with a Souls-like full-screen inventory UI based on `~/Desktop/box.png`.

## Success Criteria

- The bag opens as a dark three-column interface with gold dividers and worn-panel styling.
- Existing bag APIs and pickup/inventory flows keep working.
- Category tabs filter items, item cells can be selected, and the center details panel reflects the selected item.
- The right panel shows player stats available from the current player object plus fixed placeholder rows.
- The UI remains usable on narrow screens without overlapping text.

## Planned Changes

- Update `src/ui.js` bag CSS and markup.
- Keep `toggleBagPanel`, `closeBagPanel`, `updateBag`, and `isBagOpen` unchanged as public UI methods.
- Add small local helpers for item descriptions, selected item state, and player stat snapshots.
- Do not add dependencies or new runtime systems.

## Test and Verification Plan

- Run `npm run build`.
- Do not run browser-based checks unless explicitly requested.

## Assumptions and Out of Scope

- This is a UI-only change.
- Item use, discard, sorting, pagination, equipment management, and a full character attribute system are out of scope.
- Existing unrelated worktree changes are not part of this requirement.
