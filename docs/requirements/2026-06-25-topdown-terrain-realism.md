# Topdown Terrain Realism

## Context And Goal

The current topdown outdoor view still reads as a flat low-cost game map: broad smooth green areas, a visible rectangular terrain/proxy material boundary, thin cyan water strips, and evenly scattered small trees. Improve the terrain so the topdown view has stronger valley relief, muted natural materials, embedded rivers, and forest massing.

## Success Criteria

- Remove the obvious rectangular terrain/proxy color break by bringing distant proxy ground colors closer to the main terrain material.
- Add visible lowland micro-erosion and extra branching gullies without changing gameplay-critical clearings.
- Keep the unified dynamic water surface and existing wave animation, but make river color darker and less neon.
- Change world tree placement from uniform sparse dots to denser natural clusters and forest belts.
- Verify with `npm run build`.

## Planned Changes

- Add a lowland micro-erosion height modifier after the existing dry gully modifier.
- Expand the dry gully dataset around the visible lowland to increase natural channel density.
- Mutate terrain shader colors toward lower-saturation olive, soil, gravel, and wet-bank tones.
- Tune distant proxy terrain shader colors to match the main terrain from topdown views.
- Adjust water shader color constants only; preserve dynamic ripples, caustics, and edge alpha.
- Tune world tree clustering, density, scale, and color grade using existing approved tree assets only.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions And Out Of Scope

- No new external tree assets are introduced in this pass.
- Player, combat, collision, cave, and castle routing logic remain out of scope.
- The goal is a stronger realistic topdown terrain read, not a full layout redesign.
