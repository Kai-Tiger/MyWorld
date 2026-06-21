# Pickup And Inventory System

## Context And Goal

The existing glowing pickup aura is hardcoded and has no item behavior. The game needs a configurable pickup system and a fantasy-style tabbed inventory modal.

## Success Criteria

- Pickup positions and item mapping live in an independent config file.
- The player sees a pickup prompt near configured pickup auras.
- Pressing `H` picks up the nearby item, hides the aura, and adds the item to inventory.
- Pressing `T` opens/closes a centered inventory modal with weapon, shield, spell, and item tabs.
- The first configured pickup at `(1.8, 36)` gives one “新法术卷轴” in the spell tab.

## Planned Changes

- Add `src/config/pickups.js` for pickup definitions and item metadata.
- Extend inventory to store item ids and expose category-filtered reads.
- Replace the hardcoded sample pickup aura in `main.js` with config-driven pickup state.
- Add `KeyH` pickup input and `KeyT` inventory toggle input.
- Upgrade the existing bag panel UI into a centered tabbed inventory modal.

## Verification Plan

- Run `npm run build`.
- Confirm the pickup aura appears at `(1.8, 36)`.
- Approach the aura, press `H`, and confirm the aura disappears.
- Open inventory with `T` and confirm “新法术卷轴 ×1” appears under the spell tab.
- Confirm existing equipment bar, weapon cycling, and usable item behavior still work.

## Assumptions

- Inventory is runtime-only for this version.
- The spell scroll is collectible only and does not unlock a new spell yet.
- Pickup range is `2.2` world units.
