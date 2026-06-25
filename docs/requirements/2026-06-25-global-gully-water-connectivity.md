# Global Gully Water Connectivity

## Context And Goal

The global dendritic terrain cut creates many dry gullies, but the visible water system still only follows the older authored rivers. Add shallow rivers only to the strongest connected gullies so the new carved channels read as a connected drainage network without turning every small groove into water.

## Success Criteria

- A small set of connected main gullies contains visible shallow water.
- New water connects into existing rivers, braided lowland water, or the mountain outlet instead of ending as isolated strips.
- Water follows the local carved terrain and does not rely on a fixed absolute water level.
- The added riverbeds remain shallow and do not deepen the global cuts into canyons.
- Existing rivers, lakes, grass, and trees continue to sample water through the shared channel network.

## Planned Changes

- Add `GLOBAL_WET_GULLIES` with curated connected main-gully paths.
- Add bounds, path sampling, shallow water depth, and light bed trimming for those gullies.
- Add the new gullies to the unified water mesh and channel network.
- Add runtime water sampling so player water detection includes the new gullies.
- Add the new gullies to development river diagnostics.

## Test And Verification Plan

- Run `npm run build`.
- Start the dev server and check console output for new runtime errors.
- Inspect high-angle terrain views to confirm the main gullies are connected by water.
- Inspect near shorelines to confirm water sits inside the groove and does not form floating sheets or hard green wedges.
- Use `?riverDebug` when needed to inspect blocked or buried channel samples.

## Assumptions And Out Of Scope

- Only the main connected gullies get water; smaller procedural grooves stay dry.
- Water is shallow creek water, not a wide main river.
- This does not redesign the global erosion mask, terrain textures, lakes, or existing authored river paths.
