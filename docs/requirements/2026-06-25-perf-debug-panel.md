# Performance Debug Panel

## Context and Goal

Performance debugging currently requires manually editing URL parameters. Add an in-page panel that exposes the current perf switches, rendering quality controls, SceneRT stats, grass density, a full model-grass disable, and tree density controls.

## Success Criteria

- A collapsible `PERF` panel appears in the top-left area.
- Every control has a detailed hover tooltip.
- Live controls apply without reload.
- Reload controls save to `localStorage` and refresh automatically.
- Grass density and model-grass disable are separate controls.
- Tree density can be adjusted live.

## Planned Changes

- Add a debug panel in `src/main.js`.
- Add map debug setters for grass density, model-grass disabled, and tree density.
- Gate SceneRT object stats with a runtime toggle.
- Persist panel settings in `localStorage`.
- Add reset behavior for all debug settings.

## Test/Verification Plan

- Run `npm run build`.
- Open the page and verify the `PERF` button appears.
- Hover every control and confirm detailed browser tooltips are present.
- Toggle live controls and verify logs or visuals change without reload.
- Toggle reload controls and verify the page refreshes with the setting applied.
- Confirm disabling model grass hides grass and skips grass queue/LOD/wind work.

## Assumptions and Out of Scope

- The panel is an engineering debug tool, not final game UI.
- Default state preserves normal visuals.
- This does not change player movement, collision, terrain height, or asset loading.
