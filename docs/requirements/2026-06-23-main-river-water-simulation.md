# Main River Water Simulation

## Context and Goal

The current river reads like a flat transparent strip. The reference water shows stronger depth separation, shallow banks, irregular foam, and wet soil at the waterline.

Goal: make the main river look deeper and more physically layered while keeping tributaries lightweight.

## Success Criteria

- The main river has a visibly darker center and shallower, greener banks.
- Shore foam is broken and irregular rather than a uniform line.
- Soil near the waterline looks darker and wetter.
- Tributaries and gullies keep the existing lightweight water material.
- Build verification passes with `npm run build`.

## Planned Changes

- Add a main-river-only shader material with layered flow noise, deep center color, shallow bank color, shore tint, and foam masks.
- Add cross-river subdivisions to the main river mesh so the shader has enough UV support for center and bank bands.
- Strengthen terrain wet-bank blending near river, branch, and gully samples.

## Test/Verification Plan

- Run `npm run build`.
- Confirm `createRiverSystem` uses the new main river material.
- Confirm branch, gully, and center-west stream water still use the lightweight material.

## Assumptions and Out of Scope

- This is a shader-based visual simulation, not a physical fluid solver.
- Do not change river paths, water heights, world size, or chunk loading.
- Do not add new image assets or dependencies.
