# Castle Structure Routing And Expansion

## Context And Goal

The castle should have a believable layout with two usable doors, a Dark Souls-style entrance transition, connected interior routes, stairs, a second floor, and an exterior-facing terrace.

## Success Criteria

- The exterior castle has two human-scale doorways: one fog-covered entrance and one closed/exit-side door.
- Entering the fog gate plays a walking transition instead of an instant scene swap.
- The interior contains branching routes and a larger usable floor plan.
- Stairs connect to a second floor, and the second floor connects to a terrace with an outside view.
- The castle sits on flattened terrain without ground clipping.

## Planned Changes

- Redesign the castle facade and doorway scale so the building reads as one coherent structure.
- Add an entrance transition using the player walk animation.
- Expand the indoor layout with branching paths, stairs, second-floor areas, and a terrace.
- Flatten terrain under and around the castle and expand the map footprint to support the larger castle.

## Verification Plan

- Walk from the fog entrance through the indoor route and reach the exit-side door.
- Climb to the second floor and reach the terrace.
- Confirm the castle base no longer intersects uneven terrain.
- Run the project build after implementation.

## Assumptions

- This is a standalone requirement derived from the “城堡结构、动线与室内扩展” plan-like section.
- Later follow-up ceiling, roof, stair-hole, and terrace visibility fixes are implementation refinements, not separate plan docs.
