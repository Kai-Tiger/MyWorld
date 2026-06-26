# South basin lake shoreline foam

## Context and goal
The expanded south basin lake has a soft water edge that can disappear into the wet shoreline from overhead views. Add a visible, irregular white foam line around the south basin lake edge so the shoreline reads clearly without changing the rest of the water network.

## Success criteria
- The south basin lake has a visible broken white foam / lapping line near the shore.
- The foam follows the organic shoreline and does not form a rigid circular outline.
- The lake center remains mostly dark water, with foam concentrated near the edge.
- Other rivers, endpoint lakes, confluence pools, and the mountain lake do not receive the stronger south-basin foam treatment.

## Planned changes
- Add a per-vertex water attribute that marks only the south basin lake for stronger shoreline foam.
- Increase the south basin lake shoreline signal width and strength in the static lake geometry.
- Extend the unified water shader to use the marker for brighter, noise-broken foam and lapping highlights at the south basin shoreline.
- Keep the implementation in the existing unified water material and geometry path to avoid adding draw calls.

## Test / verification plan
- Run `npm run build`.
- Inspect the south basin lake from overhead and verify the water edge is visible.
- Inspect the river / lake junction and verify the water remains continuous.
- Inspect another lake or river and verify it does not gain the stronger white lake-edge foam.

## Assumptions and out of scope
- This change targets shoreline readability, not a full wave simulation.
- No new texture assets are added.
- A future debug slider for foam intensity is out of scope unless the visual needs more tuning.
