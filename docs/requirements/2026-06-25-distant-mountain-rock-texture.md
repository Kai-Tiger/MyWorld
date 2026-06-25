# Distant Mountain Rock Texture

## Context And Goal

The distant snow mountains currently read as smooth white low-poly walls with vertical banding. Add the provided cool gray rock texture to both near terrain and distant proxy mountain shading so far mountains show rock strata and snow/rock breakup.

## Success Criteria

- Use `public/textures/generated/rock-texture-cool-gray-01.png` for high mountain and distant proxy rock color.
- Keep snow on high ridges and gentle accumulation areas, but expose textured gray rock on steep walls.
- Reduce the pure-white wall look and obvious vertical snow strips from distant views.
- Verify with `npm run build`.

## Planned Changes

- Add a mountain rock texture uniform to the main terrain material and sample it with triplanar projection.
- Add the same texture to the distant terrain proxy shader.
- Apply the same rock texture to the snow mountain cliff skirt material.
- Bump shader cache keys so updated materials compile.

## Test / Verification Plan

- Run `npm run build`.
- Do not run browser or Playwright checks unless explicitly requested.

## Assumptions And Out Of Scope

- The provided PNG is used as diffuse/color only.
- No terrain height, river, tree, player, or gameplay logic changes are included.
