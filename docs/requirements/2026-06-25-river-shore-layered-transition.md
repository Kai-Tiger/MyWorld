# River Shore Layered Transition

## Context And Goal

The current water-to-bank transition reads too hard, especially where blue water meets pale shore terrain. Add a clearer layered visual transition: deep water, shallow near-shore water, wet mud with moss flecks, and outer riverbank. Add a subtle visual rise/fall at the shoreline so the edge does not feel like a static cutout.

## Success Criteria

- River edges show continuous deep water, shallow water, wet mud, moss flecks, and outer bank color.
- Moss appears as damp shoreline flecks, not a continuous green outline.
- Water reflection remains view-dependent through fresnel/specular highlights.
- Shoreline water visibly laps with a slow rise/fall, with the strongest movement near the bank.
- At `pos=(-249.0, -344.4) y=22.1`, facing/view `247° / 337°/-37°`, the water-to-bank transition is materially more visible than the previous hard edge.
- Newland braided rivers keep a lightweight wet mud / shallow silt bank treatment, instead of a costly full four-layer terrain shader.
- Newland static lake shores rely on the shared water edge tint instead of terrain-side per-lake fragment sampling.
- Frame rate does not regress from terrain shader shore-detail work.
- Existing river geometry, water height, collision, and gameplay sampling remain unchanged.

## Planned Changes

- Retune the unified water shader colors, fresnel/specular response, edge alpha, and shore tinting.
- Add visual-only vertex displacement to the main river water shader and connect it to shoreline alpha/tint.
- Rework terrain riverbank color layering around `riverWetEdge`, `riverBank`, and `riverMoss`.
- Rework `terrainNewlandBraidSample` bank coloring to estimate wider braided channels with a cheaper wet mud / shallow silt transition.
- Avoid GLSL static-lake shore edge sampling in the terrain shader; use water shader edge tinting for lake shores.
- Push riverside model grass slightly farther from the cut bank so wet mud and moss bands remain visible.
- Bump the terrain material cache key so the updated shader recompiles.

## Test / Verification Plan

- Run `npm run build`.
- Start the app locally and inspect the requested riverbank view plus a top-down water view.
- Confirm there are no shader compile errors, missing assets, or new hard water edge artifacts.

## Assumptions And Out Of Scope

- This pass is visual-only and does not alter river paths, terrain heights, collision, or flow sampling.
- Water rise/fall is not a gameplay water-level change and does not affect player movement or river sampling.
- No new texture assets, reflection probes, screen-space reflections, particles, or model moss are added.
- Existing unified water rendering remains in place for main river, branches, wet gullies, braided rivers, outlets, lakes, and confluence pools.
