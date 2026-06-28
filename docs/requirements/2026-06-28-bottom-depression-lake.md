# Bottom depression lake

## Context and goal
At `pos=(74.6, -319.4)`, the terrain forms a large depression with the player/camera height around `y=-31.2`. Add a natural round lake in this depression, reshaping the local terrain where needed so the lake reads as a continuous flat water body.

## Success criteria
- A visible still lake appears near `x=74.6`, `z=-319.4`, with a much larger circular water surface.
- The lake reads as a natural round lake basin, not a clipped water patch.
- The shoreline is continuous and supported by carved terrain, with no obvious jagged cut edges or floating water slabs.
- Trees and model grass do not spawn inside the lake footprint or immediate shore clearance.
- Player water sampling treats the lake as still water with zero flow.

## Planned changes
- Add a `BOTTOM_DEPRESSION_LAKE` static lake config in `src/scene/map.js`.
- Use a circular static-lake footprint around the target point, approximately `105m` radius.
- Reshape the lake basin with a larger flat floor and wider shore shelf so the round water surface is not clipped by the original uneven terrain.
- Anchor the lake bed at `flatBedY=-32.9` based on runtime height probes around the reported position.
- Set `waterDepth=2.7`, making the water surface about `-30.2`, below the surrounding higher basin rim.
- Expand shore support and vegetation clearance for the larger waterline.
- Preserve the round water shape during static-lake mesh generation so local high terrain samples do not cut serrated gaps into this lake.
- Reuse the existing static-lake terrain carving, unified water mesh, tree/grass clearance, dry-cut wet protection, and `sampleRiver` lake path.

## Test / verification plan
- Run `npm run build`.
- Inspect the target position in browser from the supplied view direction (`44deg/-29deg`).
- Confirm the lake is visibly larger than the initial version and reads as round from the screenshot overhead angle.
- Confirm the lake edge is continuous, without the previous jagged right-side shape.
- Confirm the surrounding terrain forms a plausible basin and supports the water edge.
- Confirm grass/trees are excluded from the water and immediate shore.
- Confirm `sampleRiver(74.6, -319.4)` reports `inWater=true`, positive depth, and `flowSpeed=0`.

## Assumptions and out of scope
- The reported `y=-31.2` is terrain/player height context, not the desired water surface.
- The requested "big lake" now prioritizes a natural round lake over preserving the original depression shape.
- No new art assets, standalone water renderer, river path changes, or decorative lake dressing are included.
