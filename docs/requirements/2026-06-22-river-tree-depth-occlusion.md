# River Tree Depth Occlusion

## Context and Goal

The river can appear in front of trees that should visually block it. Fix the transparency/depth ordering so trees and forest vegetation occlude river water correctly.

## Success Criteria

- Main river, river branches, and shallow stream no longer force a positive render order.
- River material keeps transparency and depth testing without changing the water shader.
- Transparent forest/tree alpha materials write depth as alpha cutouts.
- River geometry, flow shader, player water sampling, and splash behavior remain unchanged.
- `npm run build` succeeds.

## Planned Changes

- Remove river mesh `renderOrder = 3` assignments.
- Add a vegetation alpha-cutout helper for mapped transparent tree/branch/leaf materials.
- Set vegetation alpha materials to `alphaTest >= 0.35`, `transparent = false`, and `depthWrite = true`.

## Test and Verification Plan

- Run `npm run build`.
- Inspect source to confirm river sorting and vegetation depth settings changed without altering river logic.

## Assumptions and Out of Scope

- The screenshot issue is caused by transparent sorting and vegetation materials not writing depth.
- Slightly harder leaf cutout edges are acceptable to gain correct river occlusion.
- General transparent-object sorting outside river/tree occlusion is out of scope.
