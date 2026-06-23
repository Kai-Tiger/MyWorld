# Distant Terrain Proxy

## Context and Goal

Chunked terrain currently hides terrain outside the active chunk radius, so far ground can appear suddenly as the player moves. Add a low-detail 3D proxy layer so distant terrain is visible before nearby high-detail chunks load in.

## Success Criteria

- Far terrain is visible as low-detail textured 3D chunks after the heightmap loads.
- Near active chunks still use the existing high-detail terrain chunks.
- Proxy chunks are hidden where active real chunks are visible.
- Proxy terrain uses the same height sampling and terrain modifiers as real chunks.
- Proxy terrain does not affect collision, height sampling, enemies, or gameplay.
- `npm run build` succeeds.

## Planned Changes

- Add optional distant proxy support to `createHeightmapTerrain`.
- Build low-segment proxy chunks for the full chunk grid after heightmap data is ready.
- Use a cheaper diffuse-only terrain material for proxy chunks.
- Keep the current real chunk preload, active visibility, and removal logic intact.
- Hide proxy chunks inside the current active radius and show them outside it.

## Test and Verification Plan

- Run `npm run build`.
- Inspect source to confirm proxy chunks are visual-only and real chunk behavior remains unchanged.

## Assumptions and Out of Scope

- The main pop-in issue is terrain visibility, not far static models.
- The proxy is a low-detail 3D mesh, not a flat billboard screenshot.
- Trees, grass, rocks, castles, NPCs, and other model impostors are out of scope.
