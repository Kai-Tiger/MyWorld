# Realistic Nature Asset Upgrade

## Context And Goal

The current outdoor terrain reads as a low-cost game scene because the ground, rock, and vegetation materials lack believable PBR detail. The first implementation pass should raise terrain realism without disrupting the existing river network, terrain shape, water shader, or gameplay.

## Success Criteria

- Replace the main outdoor dirt and rock texture inputs with clearly sourced, license-safe PBR assets.
- Add a mossy rock detail source for river banks and weathered rock transitions.
- Reduce oversaturated outdoor sky and lighting so the landscape reads closer to natural daylight.
- Keep all current river valley geometry, water placement, and gameplay behavior unchanged.
- Verify the project with `npm run build`.

## Planned Changes

- Add Poly Haven CC0 texture sets under `public/textures/nature_pbr/`.
- Switch `createTerrainBlendMaterial` to use:
  - `aerial_ground_rock` for base dirt/rocky ground.
  - `aerial_rocks_02` for cliff and exposed rock.
  - `aerial_grass_rock` as a moss/grass-rock blend for banks and lichen zones.
- Tune outdoor exposure, sun, hemisphere, and fill light down to avoid the current over-bright cheap look.
- Desaturate sky/fog blue to a more natural grey-blue.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions And Out Of Scope

- Texture-only terrain upgrades are safe to implement immediately because the assets are CC0 and visually compatible with the current terrain shader.
- Full tree model replacement requires separate visual approval because model silhouette, density, and performance risk are much higher than terrain textures.
- This pass does not alter river routing, terrain height generation, water mesh logic, or tree placement rules.
