# Old Church Performance Optimization

## Context And Goal

Turning the camera toward the old church ruins causes noticeable stutter, likely from a large 80MB GLB, GPU upload/material compilation, shadows, and collision setup. The ruins need optimization without losing the intended visual quality.

## Success Criteria

- Runtime uses an optimized medium-size ruins model.
- Visual lighting/shadow quality remains acceptable.
- Collision is loaded from independent data instead of expensive visual-model inference.
- First-view stutter is reduced.

## Planned Changes

- Add a Blender optimization script for the old church ruins.
- Export optimized model variants and use the medium GLB in-game.
- Restore cast/receive shadows and original material quality after optimization.
- Export/load separate collision JSON for runtime collision.

## Verification Plan

- Confirm the optimized ruins model loads in the scene.
- Confirm shadows/materials remain visually acceptable.
- Confirm runtime collision no longer depends on a coarse whole-model collider.
- Run the project build after implementation.

## Assumptions

- This doc covers the ruins performance plan and “方案1/方案2” implementation request.
- Fine collision precision is covered by the dedicated old church collision document.
