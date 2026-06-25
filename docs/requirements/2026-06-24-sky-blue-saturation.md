# Sky Blue Saturation

## Context and Goal
The outdoor sky has enough saturation but still reads too light. Push the current colors toward deeper blue while keeping the existing white-cloud, lighting, fog-distance, and exposure behavior unchanged.

## Success Criteria
- Outdoor sky zenith appears deeper blue than the current `#0874ff` color.
- Horizon haze and fog shift to a deeper light blue while staying compatible with the sky gradient.
- Horizon haze and fog remain visually compatible with the sky gradient.
- Clouds, cloud density, tone mapping, and world lighting are unchanged.

## Planned Changes
- Change the sky dome zenith color from `#0874ff` to `#005fd6`.
- Change the sky dome horizon color from `#acd8ff` to `#8fcaff`.
- Change the background/fog horizon color from `#a7d6ff` to `#8ac7ff`.

## Test/Verification Plan
- Run `npm run build`.
- Browser-check the outdoor sky for a visibly deeper blue and no shader/runtime errors.

## Assumptions and Out of Scope
- Current colors are already near or at full saturation, so this pass lowers blue lightness rather than increasing saturation again.
- This does not change clouds, lighting, exposure, fog near/far, terrain, or indoor/castle scene backgrounds.
