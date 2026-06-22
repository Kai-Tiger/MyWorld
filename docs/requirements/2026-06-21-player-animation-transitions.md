# Player Animation Transitions

## Context and Goal

Player one-shot animations can end with abrupt jumps back to standing because transition timing is scattered across `src/entities/player.js`. The goal is to make animation changes visually smooth while keeping combat and movement responsive enough to play.

## Success Criteria

- Attacks, rolls, hurt, heal, pick, and spell casts blend smoothly back to locomotion.
- Holding movement during an action returns the player to walk or run instead of always standing.
- Idle, walk, and run changes feel smoother than the current short fades.
- Death, climbing, and bonfire flows keep their current behavior.

## Planned Changes

- Add shared transition duration constants in `src/entities/player.js`.
- Route animation switches through a single `switchAction` helper that accepts a blend duration.
- Add a one-shot return helper that chooses idle, walk, run, or defense based on the latest movement intent.
- Replace short local fades and direct idle returns for one-shot actions with the shared helpers.

## Test/Verification Plan

- Run `npm run build`.
- Manually check attack, roll, hurt, heal, pick, spell, locomotion, death, climb, and bonfire animation transitions.

## Assumptions and Out of Scope

- Smoothness is prioritized over the fastest possible visual response.
- No new animation assets, IK, root-motion rewrite, combat value changes, UI changes, or resource changes are included.
