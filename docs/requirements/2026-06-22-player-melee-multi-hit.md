# Player Melee Multi Hit

## Context and Goal

Player melee attacks currently choose a single best enemy in the attack arc. The goal is to let one melee hit window damage every hostile enemy inside the existing melee range and angle.

## Success Criteria

- One melee swing can damage multiple hostile enemies in the attack arc.
- Single-target melee behavior remains unchanged when only one enemy is in range.
- Empty swings still play the existing sword air sound.
- Hit sound and hitstop happen once per attack window, not once per enemy.
- Each hit enemy still gets damage text, blood splatter, aggro, and death handling.

## Planned Changes

- Replace single-target melee selection with a target list.
- Preserve current hit range, hit angle, combo range multiplier, and damage multiplier.
- Put the lock target first when it is in range, then sort other targets by distance.
- Apply the existing melee hit result to each target in the list.

## Test / Verification Plan

- Build with `npm run build`.
- Manual follow-up: place two enemies in the melee arc and confirm both take damage from one swing.
- Manual follow-up: swing with no targets and confirm sword air still plays.

## Assumptions and Out of Scope

- Multi-hit applies only to player melee attacks.
- Fireball and other projectile collisions remain single-target.
- No damage falloff is applied for additional enemies.
