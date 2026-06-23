# Steep River Banks And Soft Shore Foam

## Context and Goal

River edges currently look too flat and hard. The riverbank terrain also remains too wide and gentle for the desired channel shape.

Goal: make all waterways carve a steeper local channel with at least a 60 degree bank slope, and add softer broken foam along the water edge.

## Success Criteria

- Main river, branches, gullies, and center-west stream use the same steep local channel rule.
- Water-covered channel areas cut at least 2m below the incoming terrain height.
- Local bank run is based on a 60+ degree slope.
- River height modifiers never raise terrain above the incoming height.
- Water shader edges show broader, softer, broken foam instead of a hard thin line.

## Planned Changes

- Add a reusable steep channel carve helper in `src/scene/map.js`.
- Apply the helper to main river, branch, gully, and center-west stream height modifiers.
- Add center-west stream valley shaping to the active terrain modifier list.
- Strengthen soft shore foam in both the main river shader and the lightweight river shader.

## Test/Verification Plan

- Run `npm run build`.
- Confirm all water height modifiers call the steep channel helper.
- Confirm helper output is clamped to not exceed the incoming terrain height.

## Assumptions and Out of Scope

- Slope means the local bank from water edge back to existing terrain, not the whole broad valley wall.
- Do not change river paths, water heights, chunk loading, or world size.
- Do not add new assets or dependencies.
