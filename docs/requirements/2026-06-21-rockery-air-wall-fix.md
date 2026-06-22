# Rockery Air Wall Fix

## Context and Goal

The player feels an invisible wall near `(0, 15)`. Static inspection points to the first castle approach north-wall rockery collider near `(4, 14.5)` being wider than the visible obstruction.

## Success Criteria

- The open ground around `(0, 15)` is less likely to be blocked by the first north-wall rockery collider.
- The rest of the castle approach rockery keeps collision.
- Visible rockery geometry, terrain height, grass, mine cave, old church, and outdoor landmark colliders are unchanged.
- `npm run build` succeeds.

## Planned Changes

- Narrow only `ROCKERY_POINT_north-wall_0` to radius `2.4`.
- Narrow only `ROCKERY_SEGMENT_north-wall_0_1` to a maximum radius of `2.55`.
- Leave other `addApproachRockeryColliders()` radii unchanged.

## Test and Verification Plan

- Run `npm run build`.
- Statically confirm the nearest north-wall rockery collider no longer reaches `(0, 15)` with player radius.

## Assumptions and Out of Scope

- The reported air wall is the castle approach north-wall rockery collision near `(0, 15)`.
- This change does not remove rockery collision; it only reduces the over-wide edge near the open ground.
