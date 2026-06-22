# Castle North Highland

## Context and Goal

The raised terrain near `(51.3, 16.4)` currently reads as a narrow ridge. Turn it into a playable highland with a broad top area, climbable approach slope, enemies, rocks, and trees.

## Success Criteria

- The player can approach and walk onto a broad highland north of the castle approach.
- The top area has enough room for combat.
- The highland contains hostile enemies, rocks, trees, and shrubs.
- Existing castle entrance and main approach remain unblocked.

## Planned Changes

- Add a north highland height modifier to the castle approach terrain.
- Add a slope from the south edge into the highland.
- Add hand-placed forest pack rocks, trees, and shrubs on the highland.
- Skip blocking rockery colliders on the north ridge section that becomes the highland entrance.
- Add highland hostile NPCs through the existing outdoor enemy config.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify highland traversal, combat space, enemy placement, and castle path clearance.

## Assumptions and Out of Scope

- Existing forest pack assets and enemy model are reused.
- No new quests, loot, models, UI, or camera behavior are added.
