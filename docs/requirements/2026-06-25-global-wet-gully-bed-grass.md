# Global Wet Gully Bed Grass

## Context And Goal

The newly added global wet gullies are part of the water channel network, so normal meadow grass avoids their water footprint. Add a dedicated grass pass for exposed shallow gully beds and inner banks without placing grass underwater.

## Success Criteria

- Exposed beds and inner banks of `GLOBAL_WET_GULLIES` contain visible model grass.
- Grass is skipped when the sampled point is underwater, too high above the waterline, or on a steep wall.
- Existing meadow grass, riverside grass, water sampling, and river rendering behavior remain unchanged.
- The added grass uses existing grass assets and LOD groups.

## Planned Changes

- Generate grass placements by walking each `GLOBAL_WET_GULLIES` path and sampling laterally across the shallow bed.
- Reuse existing grass variant selection, wind material, and LOD group utilities.
- Add a loader for the new placements during terrain ready initialization.

## Test And Verification Plan

- Run `npm run build`.
- Start the dev server and check for new console errors.
- Inspect shallow wet gullies near the player and from an elevated view.
- Confirm grass does not appear below the water surface or climb steep gully walls.

## Assumptions And Out Of Scope

- "Gully bed grass" means grass on exposed shallow bed and inner bank, not underwater vegetation.
- This only targets `GLOBAL_WET_GULLIES`; dry gullies and main rivers keep their current grass rules.
