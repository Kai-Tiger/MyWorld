# Mountain Lake and Dry Gullies

## Context and Goal
Correct the mountain lake placement from the previous wrong midpoint location to near `(-900, -900)`. The lake sits between the newly added mountain features, uses the same static-lake depression and water-surface logic as the existing added lakes, and drains locally toward `+Z` into the nearby newland wetland/braided-river area. Both nearby mountain directions should show dry small river-channel scars that feed into the lake or outlet.

## Success Criteria
- A large irregular lake sits near `(-900, -900)`.
- The lake remains in `NEWLAND_STATIC_LAKES` and reuses `getNewlandStaticLakeShapeAt()`, `applyNewlandStaticLakeHeight()`, `getNewlandStaticLakeWaterY()`, and `buildNewlandStaticLakeGeometry()`.
- A visible outlet river runs from the lake toward `+Z` locally, ending near the newland wetland/braided-river area instead of the old main river.
- Dry gullies on both mountain slopes carve visible terrain traces and visually feed into the lake or outlet.
- Lake and river water surfaces are part of the unified water render and can be sampled as water.
- Trees avoid the new lake and riverbanks while existing tree coverage elsewhere remains unchanged.

## Planned Changes
- Move the static mountain lake definition to approximately `(-900, -900)` and keep it included with existing newland static lakes.
- Replace the outlet river path with a short local `+Z` path from the lake toward approximately `(-760, -520)`.
- Replace the previous wrong dry gully coordinates with four dry `EROSION_GULLIES` around the corrected lake/outlet, and update matching shader gully segments.
- Keep changes local to `src/scene/map.js`.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that the new lake, outlet, and dry gullies are wired into terrain, water render, and sampling.

## Assumptions and Out of Scope
- The lake uses the corrected location, approximately `(-900, -900)`, as the lake center.
- The outlet is local and does not force a long connection to the old main river.
- "新增的湖" means the existing `NEWLAND_STATIC_LAKES` static-lake system and its lake depression/water geometry behavior.
- No browser or Playwright verification unless explicitly requested.
- No player movement, existing ridge shape, or existing main river redesign is in scope.
