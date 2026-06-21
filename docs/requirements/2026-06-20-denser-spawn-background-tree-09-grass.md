# Denser Spawn Background Tree 09 Grass

## Context

The spawn-area grass currently uses a forest-pack GLB that does not match the desired dense grass-clump look.
The dense version should not create thousands of independent GLB clones because that adds unnecessary loading, memory, and draw-call cost.

## Goal

Use `background_tree_09.glb` for all spawn-area grass instances and make the placement dense enough to read as ground-cover grass around the world origin.
The 50-unit coverage should be optimized with ring-based density so the near area stays dense while the far area is cheaper to render.
The nearest 25 units should include a low-cost short-grass carpet layer so looking down no longer exposes obvious bare ground.
The large grass area should include sparse `background_tree_12.glb` accents.
The GLB grass clumps should follow natural curved bands rather than uniformly scattered dots.

## Success Criteria

- Spawn-area grass uses only `background_tree_09.glb`.
- The spawn-area grass count is increased for a near ground-cover feel.
- The grass count can be raised aggressively when art direction prioritizes visual density over runtime cost.
- Placement is centered at `{ x: 0, z: 0 }`.
- The grass covers a 50-unit radius around `{ x: 0, z: 0 }`.
- The inner radius is small enough that the center area does not look empty.
- The optimized ring counts can be increased by 20% when the current grass density is still not enough.
- A low-cost grass-carpet layer covers the nearest 25 units.
- Sparse `background_tree_12.glb` accents cover the 50-unit grass area at a much lower density.
- Sparse `background_tree_12.glb` accents are scaled to double their initial accent size.
- GLB grass clumps are arranged along natural S-shaped curved bands.
- GLB grass bands cross and overlap enough to reduce exposed terrain across the 50-unit area.
- Grass avoids dense forest placements, castle entrance/approach space, and campfire safety areas.
- Dense grass is rendered with `InstancedMesh` batches from one loaded GLB template.
- Dense grass does not receive shadows.
- Dense grass does not show the forest-pack object-name label.
- Build verification passes.

## Planned Changes

- Change the spawn grass model constant to `background_tree_09.glb`.
- Increase the spawn grass instance count.
- Raise the current spawn grass count fivefold when requested for a fully covered look.
- Adjust placement center, radius, and scale so the grass starts close to the origin and reads like dense ground cover.
- Expand the coverage radius to 50 units and scale the instance count by area to preserve density.
- Increase optimized ring counts by 20% when requested: inner ring 4,687 and outer ring 7,031, about 11,718 instances total.
- Add a short procedural grass-carpet layer in the 0-25 unit radius using about 8,200 low-poly instances.
- Keep the grass-carpet layer below the GLB grass clumps so it fills visible ground gaps without replacing their volume.
- Replace uniform GLB grass scattering with deterministic CatmullRom curve-band placement.
- Keep the main `background_tree_09.glb` count around 11,718, but distribute it along natural curved bands.
- Increase curve bands from 7 to about 15, widen them, and raise main `background_tree_09.glb` count to about 14,000 for overlapping coverage.
- Reduce `background_tree_12.glb` accents by 90%, from 586 to 59.
- Scale `background_tree_12.glb` accent instances up 2x, from about `0.20-0.36` to about `0.40-0.72`.
- Load `background_tree_12.glb` once and render it with the same mesh-level instancing strategy as the main GLB grass.
- Filter generated grass placements against forest, castle, and campfire avoidance zones.
- Pass runtime layout campfires into map creation so edited campfire positions are respected.
- Replace per-instance GLB cloning with one template load and mesh-level instancing.
- Disable shadow receiving on dense spawn grass instances.
- Keep forest-pack labels for normal forest objects, but exclude dense spawn grass from label registration.

## Verification

- Run `npm run build`.

## Assumptions

- "覆盖50单位的面积" is implemented as a 50-unit radius around `{ x: 0, z: 0 }`.
- Avoidance uses visible safe clearings rather than gradual density fading.
- Grass distribution is deterministic and curve-based, not runtime distance-based spawning.
- Exposed terrain outside the 25-unit carpet is reduced by overlapping GLB curve bands rather than expanding the carpet layer.
- Ground coverage is achieved with a grass-carpet layer instead of further increasing `background_tree_09` instance counts.
- `tree_12` means the existing forest-pack asset `background_tree_12.glb`.
- `background_tree_12.glb` accents are reduced by 90% and rounded to 59 instances.
- `background_tree_12.glb` accent volume is increased through uniform scale, without changing count or placement.
- The forest-pack GLB name label feature should not show `background_tree_09` for dense spawn grass because it would be constantly visible in the covered area.
