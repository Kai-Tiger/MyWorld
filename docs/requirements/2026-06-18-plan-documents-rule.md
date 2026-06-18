# Plan Documents Rule

## Context And Goal

Formal plans should not live only in chat history. Each implementation plan should also be captured as a standalone requirement document so it can be reviewed, implemented, and referenced later.

## Success Criteria

- Future formal plans have a corresponding document under `docs/requirements/`.
- Requirement documents use predictable names: `YYYY-MM-DD-short-topic.md`.
- Each document is concise, implementation-ready, and separate from chronological conversation notes.
- The rule respects collaboration-mode constraints: if file edits are not allowed during planning, the document is created at the next allowed implementation turn.

## Planned Changes

- Add project-level agent instructions in `AGENTS.md`.
- Add `docs/requirements/README.md` to define the destination and naming convention.
- Keep `conversation-history.md` as the chronological log, not the primary plan spec store.

## Verification Plan

- Confirm `AGENTS.md` exists at the project root.
- Confirm `docs/requirements/README.md` exists.
- Confirm this requirement document exists as the first example.

## Assumptions

- Only formal implementation plans require standalone documents.
- Casual advice, quick answers, and exploratory discussion do not need requirement documents.
