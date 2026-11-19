---
name: Parallel execution task
about: Claim one independently executable Skyinnk delivery with explicit dependencies, files and acceptance
title: "[Lane] Observable deliverable"
labels: []
assignees: []
---

Workstream: REPLACE_WITH_Chat_03_OR_Work_OR_Chat_01
Branch: `REPLACE_WITH_lane/task-slug`
Target: `development/v1-public-launch`

### Outcome
Describe one observable deliverable, not a broad theme.

### Execution state
READY

### Executor
Unclaimed — a running authorized agent may claim this task.

### Dependencies
- HARD: none
- SOFT: none
- External approval: none for coding

### Acceptance
- [ ] Observable scenario / fixture passes.
- [ ] Required regression tests pass.
- [ ] PR targets development, exact-head CI and reviewer evidence recorded.

### Owned / affected paths
- `path/to/owned-file`

### Reserved shared paths
- `path/to/exact-shared-file`

### Contract / integration
Specify any API/fixture used by other lanes. Name consumers and whether changes are compatible.

### Risks and escalation
Ordinary task. If blocked, state the *specific* prerequisite, unblock owner and next READY task to claim instead.

### Next eligible task
- #ISSUE (optional).

### Implementation notes
Do not start until correct branch/workstream/issue metadata and existing open-PR file claims have been checked. Preserve source history, protected branches and production restrictions.
