# Center West Stream Valley

## Context and Goal

The area around `(-270, 0)` should become a natural stream valley inspired by `~/Desktop/hero.jpg`: visible shallow water, damp soil on both banks, uneven slopes, small swales, and rolling hills.

## Success Criteria

- A shallow stream passes through the `(-270, 0)` area.
- Terrain around the stream has visible elevation variation and does not read as a flat plane.
- The stream bed is carved below the surrounding terrain; the water surface must not read as higher than both banks.
- Stream banks show darker wet soil and gray-brown eroded mud.
- Player grounding remains correct at `(-270, 0)`, `(-240, 0)`, `(-300, 40)`, and `(-220, -35)`.
- Existing distant river, snow mountains, spawn, mine, and castle areas are not materially changed.

## Planned Changes

- Add a center-west stream path, height sample, water sample, and terrain carving function.
- Render a separate shallow stream mesh using the existing river shader approach.
- Extend terrain shader wet-bank masks to include the center-west stream.
- Expose stream sampling through the map river sampler so player water state and current can account for either water body.
- Revise the stream valley cross-section so the channel floor is below water, the immediate banks sit just above water, and larger mounds start farther from the channel.

## Test and Verification Plan

- Run `npm run build`.
- Browser-check height, water level, and `yDelta` at the target points.
- Screenshot `(-270, 0)` and confirm water, damp banks, and terrain variation are visible.

## Assumptions and Out of Scope

- The center-west stream is independent from the distant main river and does not need physical confluence.
- This change does not add grass blade instances.
