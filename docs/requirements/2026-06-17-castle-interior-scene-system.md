# Castle Interior Scene System

## Context And Goal

The game needs large castle and indoor scenes inspired by Dark Souls, with believable interiors, collision-safe navigation, brighter torch lighting, and a visible fog gate entrance.

## Success Criteria

- Castle visuals read as a coherent large building rather than disconnected towers.
- The player can enter through a white fog gate without clipping through the doorway.
- Interior traversal is collision-safe and lit by stronger torches with visible flame effects.
- The castle supports future expansion into connected indoor spaces.

## Planned Changes

- Build a more realistic castle/indoor scene pipeline using authored Blender assets exported into game-ready GLB zones.
- Add or tune castle collision so walls, doors, floors, and route blockers match player traversal.
- Replace weak indoor lighting with brighter torch-based lighting and flame visuals.
- Position and style the white fog gate so it visibly covers the castle entrance.

## Verification Plan

- Enter the castle through the fog gate and confirm the transition area is visible.
- Walk through the main interior route and confirm there is no obvious clipping.
- Confirm torch lighting makes the interior readable while preserving dark-fantasy mood.
- Run the project build after implementation.

## Assumptions

- This document is reconstructed from `conversation-history.md`.
- It captures the formal castle scene plan around the first `Implement the plan` request.
- Fine-grained follow-up fixes remain in `conversation-history.md`.
