# Player MP System

## Context And Goal

The player needs an MP resource. Spell costs should be configurable, and the HUD should show MP below HP.

## Success Criteria

- Player has max MP.
- Fireball MP cost is defined in config.
- If MP is insufficient, casting does not play animation, does not enter cooldown, and does not spawn a fireball.
- Bonfire rest and death respawn restore full MP.
- The top-left HUD shows a blue MP bar below HP.

## Planned Changes

- Add `BALANCE.player.maxMp = 100`.
- Add `BALANCE.spells.fireball.mpCost = 25`.
- Add player MP accessors/mutators:
  - `getMp()`
  - `getMaxMp()`
  - `spendMp(amount)`
  - `restoreFullMp()`
- Check MP before starting fireball cast.
- Restore MP on bonfire rest and respawn.
- Add MP bar UI and update it from player state.

## Verification Plan

- Confirm initial MP displays as `100 / 100`.
- Cast one fireball and confirm MP becomes `75 / 100`.
- Confirm insufficient MP blocks casting without cooldown.
- Confirm rest/respawn restores full MP.
- Run the project build after implementation.

## Assumptions

- This doc captures the formal MP system plan from `conversation-history.md`.
- Only fireball has an MP cost in this plan.
