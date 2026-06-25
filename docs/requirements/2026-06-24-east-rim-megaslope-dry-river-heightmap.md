# East Rim Megaslope Dry River Heightmap

## Context and Goal
Create a large dry-river terrain feature around `654,-844`. This point is the slope-top center. The terrain should read as a visual 1000m-scale high slope, but use a practical in-game lift so the existing camera, fog, collision, and terrain bounds remain stable.

Heightmap sketch:

```text
                 inner lowland, toward existing world
                         ~0..40m
                           ^
                           |
        small rills   \    |    /   small rills
                       \   |   /
       branch ---------- MAIN DRY CHANNEL ---------- branch
                         /|\
                        / | \
             654,-844 slope-top center, visual 1000m
                  actual terrain lift about +240u
```

## Success Criteria
- `654,-844` is visibly the high slope-top center.
- The slope descends broadly toward the existing world center.
- One wide dry main river channel cuts down from the slope top.
- Five larger branch channels extend outward from the main channel.
- Each larger branch has multiple smaller dry rills.
- No water mesh or river sampling behavior is added for this dry river network.
- Trees are cleared from the dry channel cores and near banks.
- Dry channels are visibly deeper, but remain waterless.

## Planned Changes
- Add deterministic slope heightmap data and an `applyEastRimMegaslopeHeight` terrain modifier.
- Add dry river path data, bounds, sampling, tree-clearance, and a deeper `applyEastRimDryRiverHeight` terrain modifier.
- Add a terrain shader distance sample for dry river coloring.
- Hook the new dry river clearance into world-tree placement.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that the new dry network is not included in water geometry or `sampleRiver`.

## Assumptions and Out of Scope
- `654,-844` is the slope-top center.
- The visual 1000m height is implemented as about `+240` game units.
- "Toward inside" means generally toward `(0,0)`.
- This task does not add water, waterfalls, particle effects, or new runtime UI.
