# Taishan Ridge Newland Mountain

## Context and Goal
The mountain near `(-680, -1000)` currently reads like a broad rounded platform. It should become a Taishan-style protruding ridge: a continuous raised crest with sloped sides and no flat top.

## Success Criteria
- The mountain near `(-680, -1000)` has a clear long ridge silhouette.
- The ridge has no broad plateau at the top.
- The ridge blends into the surrounding newland hills.
- Existing rivers, water, trees, player movement, and original snow mountains are not changed.

## Planned Changes
- Add a local ridge height helper in `src/scene/map.js`.
- Apply the helper from `applyExtendedRegionHeight()`.
- Reduce the nearby rounded hill contributions that were making the area read as a platform.

## Test/Verification Plan
- Run `npm run build`.
- Static-check that the new helper only affects the newland mountain around `(-680, -1000)`.

## Assumptions and Out of Scope
- "Taishan shape" means a protruding continuous ridge with descending shoulders, not a separate mesh or snow mountain.
- No browser or Playwright verification unless explicitly requested.
