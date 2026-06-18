# Old Church Ruins Collision

## Context And Goal

The old church ruins are an explorable maze-like model. A single large bounding box blocks entry and is too coarse. Collision should be generated from meaningful internal mesh names.

## Success Criteria

- The player can enter and explore inside the ruins.
- Walls, pillars, and facades block movement.
- Floors, stones, gates, arches, and decorative meshes do not incorrectly block traversal.
- Collision matches the placed model location and rotation.

## Planned Changes

- Remove the single whole-building collider.
- Generate local collision boxes from selected GLB mesh names:
  - include wall/facade/pillar-like meshes
  - exclude pavement, loose stones, arches, gates, and decorative passable meshes
- Support rotated rectangle collision boxes where needed.
- Load generated collision data at runtime with the ruins placement transform.

## Verification Plan

- Walk into the ruins through intended entrances.
- Confirm internal walls block movement.
- Confirm central/passable areas are navigable.
- Run the project build after implementation.

## Assumptions

- This doc merges the initial old church collision plan and the later name-based precision refinement.
- Visual model optimization is covered separately.
