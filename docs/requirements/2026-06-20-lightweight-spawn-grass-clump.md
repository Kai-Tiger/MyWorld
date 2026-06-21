# Lightweight Spawn Grass Clump

## Context and Goal

The outdoor grass needs distance-based rendering: dense 3D grass around the player and vertical alpha-card grass farther away. The current project already uses GLB for static models, so the nearby grass asset should follow that format and be rendered through instancing.

## Success Criteria

- A lightweight grass-clump GLB exists at `public/models/grass/grass_clump_low.glb`.
- Nearby grass uses one `THREE.InstancedMesh` with 1400 grass clumps centered on the player.
- Model-matched vertical grass cards densely cover the full low-ground `WORLD_SIZE` area outside and below the 3D grass.
- The grass clump grows upward from the terrain, with connected roots and naturally curved long blades.
- The blades spread outward to both sides from one compact root cluster.
- Grass color uses low-saturation vertex-color variation instead of a separate texture.
- Nearby model grass uses an unlit vertex-color material so its color does not change with camera angle.
- Grass color is dark olive-green with stronger baked vertex-color light and shadow variation, with the model grass palette darkened by about 10%.
- Nearby model grass and distant card grass use a matching low-saturation screen-space olive palette, with the card texture tuned brighter and lower-contrast to match the current model grass.
- Dense grass has runtime variation through per-instance scale, tilt, and light wind motion.
- Nearby model grass scales down from `6m` to `12m`, while distant card grass stays at full size and does not fade around the player.
- Far grass renders as vertical transparent card geometry, not a flat ground texture.
- Far grass skips high terrain so it does not cover steep mountain areas.
- Far grass is split into frustum-culled cells instead of one full-map instanced mesh.
- Far grass cards stay lower and less wall-like so distant grass does not read as a dark backdrop.
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
- Extract the first mesh geometry/material from the loaded GLB and maintain a 1400-instance pool around the player.
- Replace the loaded GLB material with `MeshBasicMaterial` using vertex colors for stable model-grass color.
- Rebuild the instance matrices when the predicted grass center moves about `0.85m` from the last grass center.
- Bias the nearby grass center about `1.4m` toward the player's current movement direction so running does not expose a lagging grass edge.
- Apply per-instance non-uniform scale and tilt so repeated clumps do not look identical.
- Apply an additional edge scale from `6m` to `12m`, with a minimum scale of `0.35`, so model grass fades out by size before the card grass takes over.
- Add a lightweight material shader wind offset that moves only the upper blade area and keeps roots stable.
- Generate a transparent model-matched grass card texture at `public/textures/generated/model_grass_card.png`.
- Generate the grass card texture from a brighter low-saturation olive palette matched to the rendered model grass, reduce dark root speckling, and keep its material tint white.
- Add a no-collision far grass card `InstancedMesh` sampled against terrain height across the full `WORLD_SIZE` ground.
- Use two crossed vertical planes per far grass patch for low-cost volume.
- Keep distant card size around `0.72-1.10m` wide and `0.62-1.05m` tall.
- Use 360000 far grass patches and skip placements where terrain height is above `7.5`.
- Split far grass cards into about `24m` cells with shared geometry/material so off-camera cells can be culled.
- Keep distant grass cards at full size even under nearby model grass so no player-centered fade ring is visible.
- Pad each cell bounding sphere slightly to avoid visible grass popping when turning the camera.
- Avoid campfire clearings at `(0,50)`, `(19,-66)`, `(-18,-2)`, and `(22,22)`.
- Avoid the mine cave/tunnel entrance and ramp so grass does not cover the opening.
- Add the grass GLB to runtime model preloading.

## Test and Verification Plan

- Run the Blender export script to generate `grass_clump_low.glb`.
- Run `npm run build`.
- Inspect source to confirm the grass path does not add colliders and uses `InstancedMesh`.

## Assumptions and Out of Scope

- Nearby 3D grass follows the player with an outer radius of about `12m`.
- Nearby 3D grass uses a `0.85m` rebuild distance, a `1.4m` movement lookahead, and edge scaling to reduce visible movement of the grass boundary.
- Grass density is balanced by moving both systems toward the middle: model grass is reduced from 2400 to 1400 clumps, while far card grass is increased from 180000 to 360000 patches.
- Distant card grass does not update per-patch fade matrices at runtime; only frustum culling controls visible cells.
- Far grass cards cover low areas within the full `WORLD_SIZE = 390` ground, about `x -195..195, z -195..195`.
- Far grass skips terrain where `getGroundHeight(x, z) > 7.5`.
- Far grass cells use `DISTANT_GRASS_CELL_SIZE = 24` and `DISTANT_GRASS_CULL_PADDING = 4`.
- Far grass cards are visual geometry, not collidable grass.
- Campfire clearings use about a `4.5m` no-grass radius.
- Mine cave/tunnel clearing uses about `2.5m` padding for nearby model grass and `4m` padding for distant card grass.
- The grass is static decoration only.
- The desired long grass height is about `0.75m - 0.95m`.
- Far grass uses `public/textures/generated/model_grass_card.png`, generated from a rendered-model-matched palette with no extra material tint; the card texture alpha-weighted average color should stay around `[70, 91, 54]`.
- Collision, labels, and browser-based visual checks are out of scope.
