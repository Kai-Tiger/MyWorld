# Lightweight Spawn Grass Clump

## Context and Goal

The outdoor grass should be sparse environmental detail: no full-ground grass coverage, with small static model-grass clusters only in dense forest groves and around the old church ruins.

## Success Criteria

- A lightweight grass-clump GLB exists at `public/models/grass/grass_clump_low.glb`.
- Model grass uses one static `THREE.InstancedMesh` placed as small irregular grass piles around dense forest groves and the old church ruins.
- Full-ground distant grass cards are not generated.
- The grass clump grows upward from the terrain, with connected roots and naturally curved long blades.
- The blades spread outward to both sides from one compact root cluster.
- Grass color uses low-saturation vertex-color variation instead of a separate texture.
- Nearby model grass uses an unlit vertex-color material so its color does not change with camera angle.
- Grass color is dark olive-green with stronger baked vertex-color light and shadow variation, with the model grass palette darkened by about 10%.
- Local model grass uses a low-saturation screen-space olive palette.
- Dense grass has runtime variation through per-instance scale, tilt, and light wind motion.
- Grass is not centered on or streamed around the player.
- Far grass cards are disabled so open ground remains clear.
- Grass coverage avoids the active campfire areas.
- Grass has no collision and does not block player movement.
- Grass does not cast shadows.
- `npm run build` succeeds.

## Planned Changes

- Add a Blender script that procedurally creates a low-poly long grass clump and exports it as GLB.
- Use Blender's Z axis as height so the exported GLB stands upright in Three.js.
- Build each blade from multiple tapered sections with a shared compact root area and curved tips.
- Add vertex colors: darker roots, muted olive-green mids, and slightly dry yellow-green tips.
- Add stronger vertex-color light/shadow variation while keeping the palette dark and low-saturation.
- Fan blades to the left and right while keeping roots connected.
- Add runtime loading for the new GLB in `src/scene/map.js`.
- Extract the first mesh geometry/material from the loaded GLB and create a static instance pool sized to the accepted forest/ruins placements.
- Replace the loaded GLB material with `MeshBasicMaterial` using vertex colors for stable model-grass color.
- Generate fixed model-grass patches at the main forest grove, secondary groves, north grove, line grove, and around the old church ruins.
- Define each grass pile as about `5m²` of irregular area containing up to `30` model-grass clumps.
- Shape each grass pile as a deterministic irregular region, then fill it from jittered grid candidates instead of placing clumps as independent random points.
- Apply per-instance non-uniform scale and tilt so repeated clumps do not look identical.
- Apply per-patch edge scale so local model-grass clusters taper toward their edges.
- Add a lightweight material shader wind offset that moves only the upper blade area and keeps roots stable.
- Do not call the full-map distant grass card builder.
- Avoid campfire clearings at `(0,50)`, `(19,-66)`, `(-18,-2)`, and `(22,22)`.
- Avoid the mine cave/tunnel entrance and ramp so grass does not cover the opening.
- Use no-grass filtering with extra model-grass footprint padding so blades do not intrude into cleared edges.
- Sink local model grass roots by about `0.06m` so the clumps sit into the terrain instead of floating on top.
- Add the grass GLB to runtime model preloading.

## Test and Verification Plan

- Run the Blender export script to generate `grass_clump_low.glb`.
- Run `npm run build`.
- Inspect source to confirm the grass path does not add colliders and uses `InstancedMesh`.

## Assumptions and Out of Scope

- Local model grass is fixed world decoration, not player-following coverage.
- Local model grass uses about `0.28m` grid spacing with about `30%` jitter inside each small grass-pile shape.
- Open terrain intentionally has no grass except the forest/ruins model-grass patches.
- Distant card grass code may remain available but is not invoked by the map setup.
- Campfire clearings use about a `7m` effective no-grass radius.
- Mine cave/tunnel clearing uses about `4m` padding.
- Local model grass skips terrain where `getGroundHeight(x, z) > 7.5`.
- The grass is static decoration only.
- The desired long grass height is about `0.75m - 0.95m`.
- Far grass card texture generation is out of current runtime scope because full-ground card grass is disabled.
- Collision, labels, and browser-based visual checks are out of scope.
