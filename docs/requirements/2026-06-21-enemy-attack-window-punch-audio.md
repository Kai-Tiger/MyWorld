# Enemy Attack Window Punch Audio

## Context and Goal

`public/audio/punch.mp3` should play when an enemy attack window begins. The sound is an attack-window cue, not a hit-only cue.

## Success Criteria

- `punch.mp3` is registered in the audio system.
- Each enemy attack window plays punch once when the window is first entered.
- Punch plays even if the attack window does not hit the player.
- Repeated enemy attacks reset the punch flags and play again.
- Dead or dying enemies do not play punch.

## Planned Changes

- Add `punch: '/audio/punch.mp3'` to `AUDIO_SOURCES`.
- Import `playSfx` in `enemyNpcFBX.js`.
- Track `attackWindowAudioDone` alongside `attackWindowDone`.
- Reset attack-window audio flags whenever attack-window state resets.
- Play `playSfx('punch', { volume: 0.55 })` when an attack window overlaps for the first time.

## Test/Verification Plan

- Let an enemy complete its three-window attack and confirm each window triggers punch once.
- Confirm punch plays when the player is outside hit range.
- Confirm another attack cycle plays punch again.
- Confirm dead/dying enemies do not play punch.
- Run `npm run build`.

## Assumptions and Out of Scope

- This does not change attack timing, range, angle, damage, block, or hurt logic.
- This does not add a new volume config or UI control.
