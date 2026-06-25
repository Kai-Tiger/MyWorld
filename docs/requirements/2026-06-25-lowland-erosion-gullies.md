# Lowland Erosion Gullies

## Context And Goal

The current outdoor terrain has large river valleys and mountain forms, but many lowland and gentle-slope areas still read as too flat. Add stronger dry erosion gullies across lowlands and shallow hills without changing existing rivers, lakes, water surfaces, castle access, campfires, or mine areas.

## Success Criteria

- Add visible, branching dry gullies across lowland and gentle-slope areas.
- Keep existing wet river channels, braided river water, lakes, and confluence pools stable.
- Preserve safe/flat gameplay areas around spawn, campfires, castle approach, old church, and mine entrance.
- Reduce grass/tree coverage in gully floors so the cuts remain visible.
- Verify with `npm run build`.

## Planned Changes

- Add a `LOWLAND_EROSION_GULLIES` dataset with trunk/branch dry channels covering central lowlands, the new braided river basin, and broad extended foothills.
- Add `applyLowlandErosionGullyHeight` as a height modifier for strong but shallow erosion cuts.
- Add terrain shader coloring for lowland gully floors and aprons.
- Add grass/tree clearance helpers for the new dry gullies.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions And Out Of Scope

- The selected intensity is strong erosion.
- The selected area is all lowland/gentle-slope terrain.
- This pass does not add new water, change river paths, or replace terrain assets.
