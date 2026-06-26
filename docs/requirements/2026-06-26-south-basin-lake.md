# South basin lake

## Context and goal
Adjust the south basin lake into a deep lake at `(-294, -710)` with an approximate 45m water radius. The bottom should be flatter and deeper, the shoreline can be non-circular to follow the terrain, and the nearby wet gully should visibly feed into the lake instead of being blocked by a slope.

## Success criteria
- The lake appears at `x=-294`, `z=-710` with an organic shoreline around a roughly 45m water radius.
- The lake bed is carved to a deeper, flatter bottom than before.
- The shoreline follows the surrounding banks without an obvious floating water edge.
- At the lake / wet-gully junction near `(-267.5, -687.1)`, the blocking slope is carved down so river water can enter the lake.
- River water meshes fade out inside the lake so the lake surface keeps one continuous color.
- Grass starts away from the waterline, with a visible wet mud / dry bank gap between lake water and grass.
- The lake edge has a subtle animated lapping waterline and darker wet soil at the shore.
- Grass does not appear under the water surface.
- Rocks, trees, shrubs, and grass are visible around the lake without blocking the full shoreline.

## Planned changes
- Move `SOUTH_BASIN_LAKE` 50m toward negative Z.
- Expand the south basin lake radius by 10m, from roughly 35m to 45m.
- Replace the hard circular shoreline with south-basin-specific shoreline scale anchors, pulling the southwest edge inward and preserving a wider river-mouth side.
- Add per-lake flat-bed carving using a fixed bottom height and steeper inner bank interpolation.
- Add an outer shore shelf/back-run so lake edges have terrain support instead of cutting directly into steep slopes.
- Route `south_basin_feed` through the lake mouth and blend its water surface to the lake level near the junction.
- Add a lake-mouth carve so the junction terrain slopes into the water instead of forming a raised shoulder.
- Mask the connected wet-gully and nearby braided-river water meshes inside the lake to prevent stacked transparent water color bands.
- Move the south-basin lake grass ring outside the wet bank, starting about 9m from the shoreline.
- Add a south-basin lake wet mud band to the terrain shader: dark wet soil near the water, then a dry-bank transition before grass.
- Let the south-basin lake water mesh use the shoreline lapping path in the unified water shader.
- Keep deterministic lakeside forest-pack rocks, trees, shrubs, and grass tied to the lake ring helper so they follow the moved organic lake.
- Move lakeside rocks, trees, and shrubs outward by 10m so they remain outside the expanded waterline.

## Test / verification plan
- Run `npm run build`.
- Inspect the outdoor map at `(-294, -710)` and verify organic water shape, a deeper flat bed, supported banks, no underwater grass, and lakeside rocks/trees/grass.
- Inspect `pos=(-320.0, -739.8)` and verify the southwest lake edge no longer reads as floating.
- Inspect `pos=(-252.4, -700.9)` and verify the expanded northeast lake edge reaches this area naturally.
- Inspect `pos=(-267.5, -687.1)` and verify the river / lake junction is opened and water appears continuous.
- Inspect from overhead and verify no dark river-colored strip continues across the lake surface.
- Verify grass does not touch the waterline; there is a wet/dry soil band before the grass begins.
- Verify the lake water edge has a subtle animated lapping effect over the wet mud.
- Check that the new decorations do not noticeably increase draw calls or block movement around the lake.

## Assumptions and out of scope
- The 45m radius refers to the visible water surface, not the full terrain influence area.
- The lake is standalone and does not need a new stream connection.
- No new art assets are added; existing forest and grass assets are reused.
