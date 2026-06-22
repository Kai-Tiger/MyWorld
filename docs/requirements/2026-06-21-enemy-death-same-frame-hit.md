# Enemy Death Player Hurt Fix

## Context and Goal

When the player kills an enemy on the same frame that the enemy attack window is active, the enemy can damage the player before the melee kill is processed. This looks like the enemy triggers the player's hurt animation while already falling into its death animation.

## Success Criteria

- Player melee kills are resolved before outdoor enemy attack windows run for that frame.
- Pending player melee hit events are drained before outdoor enemy attack windows run.
- Enemies killed by player melee cannot still damage the player in that same frame.
- Enemies in death animation cannot trigger `player.receiveEnemyAttack()`.
- If the dying enemy already triggered the player's hurt reaction in the same exchange, that hurt reaction is canceled.
- Enemy `hurtAction` is stopped immediately when death starts and cannot blend into death.
- Living enemies can still damage the player normally.
- Existing death animation updates continue to run.

## Planned Changes

- Move player melee hit processing before `updateOutdoorNpcs(dt)` in the outdoor update flow.
- Drain pending player melee hit events before updating enemies.
- Clear enemy attack-window state when death starts.
- Guard enemy attack-window damage so it only runs when the enemy is alive, has HP, and is not dying.
- Pass enemy source into `player.receiveEnemyAttack()` and cancel the matching player hurt reaction when that enemy dies.
- Stop and clear enemy hurt state when death starts; do not use `hurtAction` as the transition action into death.
- Keep spell, enemy death animation, hitstop, block impact, and death checks otherwise unchanged.

## Test/Verification Plan

- Run `npm run build`.
- Manually verify melee killing an attacking enemy does not trigger player hurt from that dying enemy.
- Manually verify a living attacking enemy can still hurt or be blocked by the player.

## Assumptions and Out of Scope

- This fix targets outdoor hostile NPC combat only.
- No changes to damage values, attack windows, enemy AI, player hurt logic, or animation assets.
