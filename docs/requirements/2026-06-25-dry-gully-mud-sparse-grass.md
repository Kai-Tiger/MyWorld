# Dry Gully Mud And Sparse Grass

## Context And Goal

Dry gullies should not look like normal meadow ground. The goal is to keep their recessed bottoms visually damp and mostly bare, with only sparse grass clusters along the center line.

## Success Criteria

- Dry gully floors render as darker damp soil.
- Global model grass is removed from dry gully walls and shoulders.
- Only the central dry gully floor keeps sparse clustered grass.
- Wet rivers, wet gullies, lakes, and water rendering remain unchanged.
- Build passes.

## Planned Changes

- Add dry gully grass mask settings for core width, sparse keep amount, cluster scale, and edge fade.
- Reuse existing dry gully sampling for old dry erosion gullies, lowland gullies, dendritic gullies, and east rim dry rivers.
- Apply the dry gully mask inside global model grass placement.
- Strengthen terrain shader dry gully cores with damp dark soil and subtle sheen.
- Leave gully height shaping and water systems unchanged.

## Test And Verification Plan

- Run `npm run build`.
- Inspect dry gullies and confirm the center has sparse grass clusters while walls/shoulders are mostly bare.
- Confirm wet channels still show their existing water and bank materials.

## Assumptions

- "No-water gullies" means dry erosion gullies, lowland erosion gullies, dendritic gullies, and east rim dry rivers.
- Existing shader soil colors are sufficient; no new texture asset is required.

## Out Of Scope

- Changing terrain height carving.
- Changing grass LOD distances, budgets, or debug density controls.
- Adding new downloadable texture assets.
