# Global Riverbed Audit

## Context and Goal

Recent river screenshots show water/terrain mismatches at several coordinates, including the newland braided river and other channels. These should not be fixed by one-off coordinate patches. The goal is to add a development-only whole-map audit that scans water footprints and reports systemic riverbed, water-surface, shoreline, and wet-bed issues.

## Success Criteria

- `?riverAudit=1` runs a whole-map water audit in development builds only.
- The audit covers main river strips, branches, wet gullies, global wet gullies, newland braided rivers, the mountain outlet, and static lakes.
- Reports include issue type, water system id, world coordinate, water height, ground height, depth, expected depth, and severity.
- Known verification points `(-413.1, -326.8)`, `(-213.4, -386.8)`, and `(-231.9, -477.7)` are included in the workflow as sample checks, not as hardcoded fixes.
- Normal gameplay startup remains unchanged unless the debug flag is enabled.

## Planned Changes

- Add a `runGlobalRiverbedAudit(getGroundHeight)` development helper in `src/scene/map.js`.
- Scan strip-based channels along centerline and cross-section samples.
- Scan the newland braided unified water bounds on a coarse grid and detect water/bed discontinuities.
- Scan static lake footprints and shore zones.
- Log a compact summary plus top issue rows to the console.

## Test and Verification Plan

- Run `npm run build`.
- Run the game with `?riverAudit=1` and inspect the console report.
- Use user-provided screenshots for final visual verification at the known problem coordinates.

## Assumptions and Out of Scope

- The audit is diagnostic and development-only.
- This change does not add a player-facing debug UI.
- This change does not add per-coordinate terrain patches.
