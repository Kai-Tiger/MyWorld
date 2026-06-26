# Project Agent Instructions

## Plan Documents

When producing a formal implementation plan for this project, keep an independent requirement document for that plan.

- Store requirement documents in `docs/requirements/`.
- Use filename format `YYYY-MM-DD-short-topic.md`, for example `2026-06-18-outdoor-shadow-lighting.md`.
- A requirement document should be concise and implementation-ready. Include:
  - title
  - context and goal
  - success criteria
  - planned changes
  - test/verification plan
  - assumptions and explicit out-of-scope items
- If the current collaboration mode permits file edits, create or update the requirement document when the formal plan is finalized.
- If the current collaboration mode forbids file edits, include the intended requirement document path in the plan and create it at the next allowed implementation turn.
- Keep `conversation-history.md` for chronological conversation notes; use `docs/requirements/` for standalone plan/requirement specs.

Do not create requirement documents for casual discussion, quick answers, or exploratory notes. Only create them for formal plans intended to guide implementation.

## Git Commits

After each completed code or document change, create a git commit for that change.

- Commit only the files directly related to the completed change.
- Do not include unrelated dirty work, generated artifacts, or user changes in the commit.
- Write a detailed commit message that explains:
  - what changed
  - why it changed
  - how it was verified, or why verification was not run
- If several independent changes are requested, commit them separately instead of batching them into one broad commit.
