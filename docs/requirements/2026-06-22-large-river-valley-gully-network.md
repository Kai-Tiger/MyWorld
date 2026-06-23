# Large River Valley Gully Network

## Context and Goal

The whole central outdoor map should read as a large natural river valley. The visual target is a dense erosion network like `~/Desktop/terr1.png`: a main river, many small water creeks, water-filled gullies, broken ridges, terraces, and fewer empty flat patches.

## Success Criteria

- The `(-171, 100)` area is no longer a broad empty flat area.
- The central map reads as one large valley, not isolated river strips.
- Real water creeks have terrain below water at the channel center.
- Every valley gully has a visible narrow stream mesh.
- Fine gully streams have terrain below water at the channel center.
- Existing spawn, castle, mine, old church, snow mountains, and chunked terrain loading remain functional.

## Planned Changes

- Add more branch creeks to the existing river network.
- Add water-filled erosion gullies that affect terrain, shader masks, and stream meshes.
- Add a broad valley shaping pass before river and gully carving.
- Extend terrain shader masks for gully gravel, wet mud, and darker lowland grass.
- Include gully streams in river sampling so player water interaction can detect them.

## Test and Verification Plan

- Run `npm run build`.
- Browser-check branch water and gully stream points around central valley.
- Verify player grounding at a side-channel/gully point.

## Assumptions and Out of Scope

- All fine valley gullies are narrow stream meshes, not dry gullies.
- Dense grass and forest placement are separate follow-up work.
