# Combo Cancel Window

## Context And Goal

The two-hit combo feels too slow. The first attack should be interruptible near the end so the second attack starts sooner.

## Success Criteria

- A valid second `J` press during the combo window cuts off the last roughly 10 frames of the first attack.
- The second attack begins immediately after the early cancel.
- Single-attack behavior remains unchanged if the player does not press `J` again.

## Planned Changes

- Add an early cancel threshold near the end of the first attack.
- When combo input is buffered/received within the allowed window, transition directly to the second attack.
- Preserve the existing first-hit timing and base combo state machine.

## Verification Plan

- Trigger the two-hit combo and confirm the second attack starts faster.
- Confirm pressing `J` outside the combo window does not incorrectly skip animation.
- Run the project build after implementation.

## Assumptions

- “Last 10 frames” is implemented as an equivalent animation-time cutoff.
- This doc covers the formal plan followed by `Implement the plan`.
