# Forest Pack GLB Name Label

## Context

The outdoor scene loads multiple GLB models from `/models/forest_pack/`. During asset selection and map tuning, the player needs a lightweight way to identify which forest-pack GLB they are standing near.

## Goal

When the player approaches a GLB instance loaded from the forest pack, show a non-interactive floating label with that GLB file name without the `.glb` extension.

## Success Criteria

- Forest-pack GLB instances register their source file name when loaded.
- The nearest registered instance within interaction range shows its name.
- The label is visual only and cannot be clicked.
- The label hides when higher-priority prompts are active: castle fog gate, house door, bonfire, pickup, or NPC talk.
- Build verification passes.

## Planned Changes

- Register loaded forest-grove and spawn-grass instances as forest-pack label targets.
- Expose a map query for the nearest forest-pack label target.
- Add a UI label element styled separately from interaction buttons.
- Call the query from the outdoor update loop after higher-priority prompt detection.

## Verification

- Run `npm run build`.
- Start the local dev server and confirm the outdoor scene loads without console errors from this feature.

## Assumptions

- The label text should be the GLB file name without `.glb`, such as `background_tree_12`.
- Spawn grass using forest-pack assets also counts as a forest-pack GLB instance.
- A 3 meter range is sufficient for normal forest-pack objects; dense spawn grass uses a slightly smaller range to reduce constant label display.
