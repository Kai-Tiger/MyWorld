# NPC Talk Turn Transition

## Context and Goal

NPCs currently snap to face the player when dialogue starts. The goal is to make NPCs rotate smoothly into their dialogue-facing direction without changing dialogue UI timing or player behavior.

## Success Criteria

- Starting dialogue with a normal NPC no longer snaps the NPC rotation instantly.
- Starting dialogue with an FBX NPC no longer snaps the NPC rotation instantly.
- Nearby focus turning also uses the same smooth turn behavior.
- Dialogue panel timing and player-facing behavior remain unchanged.

## Planned Changes

- Add shortest-path yaw interpolation helpers to `npc.js` and `npcFBX.js`.
- Remove direct rotation assignment from `startTalk()`.
- Smooth NPC facing in each entity's `update()` while talking or focused.
- Keep the turn speed local to the NPC files at `7.5`.

## Test / Verification Plan

- Build with `npm run build`.
- Manual follow-up: talk to a normal NPC and confirm the NPC turns smoothly.
- Manual follow-up: talk to an FBX NPC and confirm the NPC turns smoothly.

## Assumptions and Out of Scope

- Only NPC rotation needs smoothing; the player can still face the NPC immediately.
- This does not change dialogue range, prompts, panel placement, or NPC movement rules.
