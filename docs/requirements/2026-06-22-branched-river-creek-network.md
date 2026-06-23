# Branched River Creek Network

## Context and Goal

The central river valley should feel like a natural water network instead of a single isolated river. The main river remains the dominant channel, with smaller creeks and one shallow side channel adding natural branching.

## Success Criteria

- Multiple small creeks branch into or around the main river.
- Branch creek beds are below their water surfaces, with dry terrain rising outside the waterline.
- Main river, branch water meshes, terrain carving, and player water sampling use consistent water samples.
- Existing spawn, castle, mine, old church, snow mountains, and chunked terrain loading remain functional.

## Planned Changes

- Add a `RIVER_BRANCHES` configuration for north, southwest, central side-channel, and east creeks.
- Add branch water sampling, branch terrain carving, and branch water meshes.
- Include branch wet-bank masks in terrain shader coloring.
- Update `sampleRiver` to choose the active water body across main river and branches.

## Test and Verification Plan

- Run `npm run build`.
- Browser-check main river and branch points for ground/water relationship.
- Confirm player grounding remains correct on branch creek terrain.

## Assumptions and Out of Scope

- Branches are visual/environmental water features and do not add new gameplay.
- Dense grass and new vegetation are separate follow-up work.
