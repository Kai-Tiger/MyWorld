# Enemy Engagement Commit

## Context and Goal

When a seated enemy notices the player, the player can immediately move outside disengage range while the enemy is still standing up. The enemy then drops engagement and sits back down before it ever starts chasing.

## Success Criteria

- Once an enemy notices the player, it finishes its alert/stand-up sequence and starts pursuit.
- Moving outside `disengageRange` during alert/stand-up does not immediately make the enemy sit down.
- Normal disengage still works after the short engagement commit period.
- Leash return-home behavior still works when the enemy is pulled beyond `leashRadius`.

## Planned Changes

- Add a short engagement commit timer in `enemyNpcFBX.js`.
- Start the timer from `startEngagementSequence()`.
- Ignore ordinary `dist > disengageRange` disengage while alerting, guard-dashing, or the commit timer is active.
- Reset the timer when combat state is cleared for return/death/disengage.

## Test/Verification Plan

- Let a seated enemy spot the player, then immediately run backward past `disengageRange`; confirm it does not sit back down during stand-up.
- Confirm the enemy begins chase after alert/stand-up.
- Confirm normal disengage still works after the commit period.
- Confirm leash return still works.
- Run `npm run build`.

## Assumptions and Out of Scope

- This does not make enemies chase forever.
- This does not change attack windows, damage, audio, or animation assets.
