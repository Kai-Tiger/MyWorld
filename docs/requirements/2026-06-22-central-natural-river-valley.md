# Central Natural River Valley

## Context and Goal

The central outdoor map should read as one coherent natural river valley instead of separate local water features with raised banks. The river should sit in a carved channel inside a broad floodplain, with gradual slopes and terraces toward the surrounding high ground.

## Success Criteria

- A continuous meandering river crosses the central playable area.
- The river bed is lower than the water surface, and terrain outside the waterline rises above the water.
- The central valley has a broad floodplain with subtle swales, point-bar-like shallow banks, and higher outer terraces.
- The old center-west stream does not create a second overlapping water surface in the same area.
- Existing spawn, castle, mine, old church, snow mountains, and chunked terrain loading remain functional.

## Planned Changes

- Replace the old main river route with a central meandering route.
- Use the main river sample for water mesh, terrain carving, river current, and shader river-bank masks.
- Rewrite main river terrain shaping to create a low channel, wet edge, floodplain, and outer terrace rather than high artificial berms.
- Disable the center-west stream system in the current map assembly so the central river is the single dominant water body.

## Test and Verification Plan

- Run `npm run build`.
- Check central locations around `(-270, 0)`, `(-160, -32)`, `(0, 25)`, `(140, 0)`, and `(260, -70)` for sensible ground/water relation.
- Verify the player remains grounded on nearby dry terrain and does not float.

## Assumptions and Out of Scope

- The target valley style is an open natural river valley, not a narrow mountain canyon.
- Dense grass coverage remains a separate optimization task.
- This change does not add new gameplay or new terrain assets.
