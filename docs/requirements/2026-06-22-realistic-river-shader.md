# Realistic River Shader

## Context and Goal

The current river shader has basic flow noise, edge foam, and splash sprites, but the water still reads too flat. Improve the material so the river surface feels more like moving water without changing river geometry or gameplay logic.

## Success Criteria

- River water has more realistic directional flow, wave detail, and broken foam.
- Water color varies between deeper center water and shallower/foamy edges.
- The shader includes view-dependent fresnel/glint effects.
- Existing river geometry, player water sampling, and splash sprite logic remain unchanged.
- No new texture assets are required.
- `npm run build` succeeds.

## Planned Changes

- Upgrade `createHeroRiverMaterial` with additional vertex varyings for world position and view direction.
- Replace the flat color/noise fragment shader with layered procedural water height, fake normals, fresnel, specular glints, and foam masks.
- Keep the material driven only by the existing `uTime` uniform.
- Reuse the same upgraded material for the main river and the center-west stream.

## Test and Verification Plan

- Run `npm run build`.
- Inspect source to confirm no river geometry, collision, or sample logic changed.

## Assumptions and Out of Scope

- This pass targets water material realism, not river path layout or riverbed terrain.
- Screen-space reflection, real reflection probes, and new water normal textures are out of scope.
- Browser-based visual checks are out of scope unless explicitly requested.
