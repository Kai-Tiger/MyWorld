# River Plane Hard Edge Fix

## Context And Goal

Some river edges expose rectangular or triangular water-plane artifacts near shorelines and junctions. Tighten water masks and geometry generation so water is only visible where the channel footprint is valid.

## Success Criteria

- River edges no longer show obvious rectangular or straight-edged dark water planes.
- Braided river grid cells do not generate large triangles from single wet vertices.
- Confluence pool edges fade and clip without visible hard discs.
- Existing water paths, terrain carving, grass placement, and water sampling remain unchanged.

## Planned Changes

- Discard very low `aWaterMask` pixels in the water shader.
- Add edge, end, and depth-based `aWaterMask` falloff to strip river geometry.
- Require stronger wet vertex coverage before emitting braided-river grid triangles.
- Add radial mask and wet-triangle filtering to confluence pool geometry.

## Test And Verification Plan

- Run `npm run build`.
- Start the dev server and check for new console errors.
- Inspect shallow rivers and braided river junctions from close and elevated views.
- Confirm water remains continuous while hard rectangular plane edges disappear.

## Assumptions And Out Of Scope

- This fixes water-plane visibility artifacts, not the river route layout.
- Slightly narrower visible water edges are acceptable if they remove hard planes.
