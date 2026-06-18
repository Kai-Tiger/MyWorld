# Outdoor Night Lighting

## Context And Goal

Nighttime outdoor lighting is too dark. The goal is to raise night visibility without changing daytime lighting or indoor lighting.

## Success Criteria

- Outdoor night scenes are easier to read.
- Daytime lighting remains unchanged.
- Indoor lighting remains unchanged.
- The environment keeps a dark-fantasy mood and does not become flat or washed out.

## Planned Changes

- Apply a layered nighttime-only lighting lift:
  - `exposure.night: 1.24 -> 1.34`
  - `moon.nightIntensity: 0.95 -> 1.35`
  - `hemisphere.nightIntensity: 0.68 -> 0.86`
  - `fill.nightIntensity: 0.42 -> 0.58`
- Keep sun night strength, sky color, and fog color unchanged.

## Verification Plan

- Check outdoor night visibility around terrain and buildings.
- Confirm daytime lighting is unchanged.
- Run the project build after implementation.

## Assumptions

- This doc captures the formal “夜晚的室外光线太昏暗” plan.
- Later lighting changes are separate tuning passes.
