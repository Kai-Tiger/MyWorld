# Bottom depression lake

## Context and goal
At `pos=(74.6, -319.4)`, the terrain forms a large depression with the player/camera height around `y=-31.2`. Add a lake in the bottom of this depression without flooding the whole basin.

## Success criteria
- A visible still lake appears near `x=74.6`, `z=-319.4`, with about double the initial lake surface area.
- The lake reads as a bottom deep lake, not a full-basin flood.
- The shoreline is irregular but continuous, supported by carved terrain, and does not show obvious jagged cut edges or floating water slabs.
- Trees and model grass do not spawn inside the lake footprint or immediate shore clearance.
- Player water sampling treats the lake as still water with zero flow.

## Planned changes
- Add a `BOTTOM_DEPRESSION_LAKE` static lake config in `src/scene/map.js`.
- Use an irregular rotated ellipse around the target point, approximately `74m x 51m`, which doubles the initial lake area without doubling radius.
- Smooth the boundary scale anchors so the lake keeps a natural outline without hard-looking serrated edges.
- Anchor the lake bed at `flatBedY=-32.9` based on runtime height probes around the reported position.
- Set `waterDepth=2.7`, making the water surface about `-30.2`, below the surrounding higher basin rim.
- Expand shore support and vegetation clearance for the larger waterline.
- Reuse the existing static-lake terrain carving, unified water mesh, tree/grass clearance, dry-cut wet protection, and `sampleRiver` lake path.

## Test / verification plan
- Run `npm run build`.
- Inspect the target position in browser from the supplied view direction (`44deg/-29deg`).
- Confirm the lake is visibly larger than the initial version, remains contained in the depression bottom, and does not flood the full hollow.
- Confirm the lake edge is continuous from the screenshot overhead angle, without the previous jagged right-side shape.
- Confirm grass/trees are excluded from the water and immediate shore.
- Confirm `sampleRiver(74.6, -319.4)` reports `inWater=true`, positive depth, and `flowSpeed=0`.

## Assumptions and out of scope
- The reported `y=-31.2` is terrain/player height context, not the desired water surface.
- The requested "big lake" is implemented as the chosen bottom deep lake scale, not a 100m+ landmark basin.
- No new art assets, standalone water renderer, river path changes, or decorative lake dressing are included.
