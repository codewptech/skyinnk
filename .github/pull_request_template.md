## Task ownership (mandatory for development PRs)

Task issue: #REPLACE_WITH_TASK_ISSUE_NUMBER
Workstream: Chat 03 / Work / Chat 01
Base development SHA: `REPLACE_WITH_REMOTE_SHA`

## Scope and changed paths

- Describe exactly what changed and why.
- List cross-stream files and their reservation in the task issue.
- Confirm the source branch is a fresh `chat03/task-*`, `work/task-*`, or `chat01/task-*` branch created from current remote development.

## Validation performed (record actual results)

- [ ] `npm run test:all`
- [ ] `npm run check:all`
- [ ] Other task-specific tests and manual checks (details below)
- [ ] Open PR overlap and shared ownership checked

## Risk and release gates

- Describe any failed/blocked checks, dependencies and rollback risks.
- [ ] No production/main push, live Neon migration, or production infrastructure change.
- [ ] No unapproved changes to other workstreams' source.
- [ ] Chat 03 cross-layer review requested where applicable.

> For draft legacy PR #1 only, the old branch naming/task-metadata format is temporarily grandfathered. New PRs must comply.
