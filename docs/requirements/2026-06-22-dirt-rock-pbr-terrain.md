# Dirt/Rock PBR Terrain Surface

## Context and Goal

The outdoor ground currently reads as a tinted flat surface instead of natural uneven earth. Replace the base terrain material with a visually bumpy dirt and rock PBR blend without generating new grass blades or changing terrain collision.

## Success Criteria

- Outdoor terrain uses dirt and rock PBR texture sets already checked into `public/textures/souls_terrain/`.
- Flat and lower ground reads mostly as compact dirt with subtle damp/debris variation.
- Steeper and higher ground blends toward rock.
- Surface bumpiness is visual only through normal maps; heightmap geometry and player collision are unchanged.
- No new grass meshes, grass cards, or procedural grass blades are added.

## Planned Changes

- Update `createTerrainBlendMaterial` in `src/scene/map.js` to use `Ground103` as the dirt base and `Rock064` as the rocky blend layer.
- Use world-space UV sampling so the terrain texture scale stays consistent across the heightmap.
- Blend color, normal, roughness, and AO using slope, height, and low-frequency noise masks.
- Add subtle dry leaf/debris color variation from the existing Poly Haven dry decay leaves texture without adding any geometry.
- Ensure the terrain geometry has a `uv2` attribute for AO map support.

## Test/Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright verification unless explicitly requested.

## Assumptions and Out of Scope

- Use existing local PBR assets only; no downloads.
- "凸凹不平" means visual relief, not actual micro-displacement.
- Grass density, lighting, camera, scene layout, and collision tuning are out of scope.
