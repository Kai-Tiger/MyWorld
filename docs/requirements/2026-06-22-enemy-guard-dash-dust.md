# Enemy Guard Dash Dust

## Context and Goal

When an enemy performs the one-shot cross-guard dash toward the player, its feet should kick up grounded dust so the movement feels physical and realistic.

## Success Criteria

- Dust appears only during the actual `guardDash` dash movement, not while standing up, walking, attacking, hurt, dead, or returning home.
- Dust originates near the enemy's feet at terrain height, trails slightly behind the dash direction, expands low to the ground, and fades quickly.
- The effect uses existing VFX smoke textures and a small sprite pool instead of creating unbounded runtime objects.
- Resetting hostile NPCs disposes the dust sprites.
- `npm run build` succeeds.

## Planned Changes

- Add a lightweight pooled dash dust effect in `src/effects/dashDust.js`.
- Add enemy balance config for enabling the effect, spawn rate, pool size, and dust color.
- Create and update the dust effect from `enemyNpcFBX.js`; emit particles only after a successful guard dash movement step.
- Dispose the effect through the enemy NPC `dispose()` method and call that when hostile NPCs are reset.

## Test and Verification Plan

- Statically verify dust emission is limited to the guard dash movement branch.
- Statically verify the effect uses a bounded pool and existing texture paths.
- Run `npm run build`.

## Assumptions and Out of Scope

- The dust is intentionally subtle: muted gray-brown, normal alpha blending, short lifetime, and low vertical lift.
- This does not add dust to normal running or player movement.
- No browser or Playwright verification is included for this change.
