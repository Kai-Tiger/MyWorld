# Distant Forest Canopy

## Context and Goal
The distant forest currently looks like noisy sparse dots compared with the reference image, because world trees thin both whole instances and individual crown fragments at distance. The goal is to make distant forests read as continuous canopy masses while keeping the existing world-tree placement and water/gully avoidance rules.

## Success Criteria
- Distant world-tree crowns remain visually dense and continuous.
- Far world-tree instances are not reduced to 70%.
- Leaf hash discard keeps at least 90% of crown fragments.
- Tree color grading still works.
- Existing terrain, water, and tree placement exclusion rules are unchanged.

## Planned Changes
- Increase world-tree leaf retention distances and minimum keep ratio.
- Stop far world-tree instance thinning.
- Keep alpha cutout materials and existing color grading.
- Make leaf discard a very mild far-distance effect instead of a strong canopy-thinning mechanism.

## Test/Verification Plan
- Run `npm run build`.
- Static-check world-tree constants and tree color grading hooks.

## Assumptions and Out of Scope
- Visual quality is prioritized over the previous aggressive far-distance optimization.
- No new impostor, billboard, or baked canopy system is included.
- No browser or Playwright verification unless explicitly requested.
