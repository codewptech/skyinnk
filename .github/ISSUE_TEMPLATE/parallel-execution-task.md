---
name: Parallel execution task (PEA-2)
about: Create an independently executable task; newly created tasks remain BACKLOG until validated and explicitly claimed
title: "[PEA] Short observable delivery"
labels: []
assignees: []
---

<!-- Replace ALL PLACEHOLDERS. The existing governance checker requires the exact Workstream, Branch and Reserved shared paths headings. Leave a new task BACKLOG until a coordinator verifies real dependencies, file claims and executor availability. -->
<!-- In the two path sections, put one exact backtick-quoted file path per dash bullet. Include both old and new rename paths. If there are no shared paths, keep the shared heading and write only 'None.'. -->

Workstream: REPLACE_WITH_Work_OR_Chat_03_OR_Chat_01
Branch: `REPLACE_WITH_role/task-short-name`
Target: `development/v1-public-launch`
Delivery lane: REPLACE_WITH_Learning_Experience_OR_Technical_Foundation_OR_Quality_Remediation_OR_Governance
Priority: REPLACE_WITH_P0_P1_P2_P3
Risk: REPLACE_WITH_ordinary_OR_shared-interface_OR_sensitive-governance_OR_release-gated

### Outcome

One objectively verifiable outcome, with no unrelated feature expansion.

### Execution state

BACKLOG

### Executor

unclaimed

### Claim lease

none / advisory — NEVER claim an atomic lock unless a working claim broker actually granted a generation and expiry.

### Dependencies

- START: none
- INTEGRATION: none
- SOFT: none
- External approval: none for implementation

<!-- Use #ISSUE for START, #ISSUE or #PR for INTEGRATION/SOFT; enumerate exact IDs. START dependencies MUST be DONE before beginning. INTEGRATION dependencies may allow isolated fixture-based work but block merge. Do not substitute "HARD or isolated" because hard prerequisites cannot be waived. -->

### Acceptance

- [ ] Objective behavior and negative case demonstrated.
- [ ] New/updated regression tests executed with truthful output.
- [ ] Current exact branch/head and required Development CI reported.
- [ ] Relevant independent technical review completed or limitation recorded.
- [ ] Post-merge development SHA and CI recorded before DONE.

### Owned / affected paths

- `REPLACE_WITH_actual-file-path`

### Reserved shared paths

- `REPLACE_WITH_exact-shared-path-or-remove-this-bullet`

### Contract / integration

API, schema, fixture or UX interface consumed by other lanes; named downstream consumers; compatibility test.

### Reviewer / integration handoff

- Technical review lane: REPLACE_WITH_workstream
- Exact-head review evidence: pending
- Integration steward: Chat 03; protected-branch merge only after required review and CI

### Risks and escalation

Specific blocked decision only if one exists. Otherwise 'none'. Do not ask HQ for routine permissions.

### Next eligible task

none

### Claim and operation notes

Check open issue claims as well as open PR files BEFORE making any edits; the existing PR checker cannot detect unpublished concurrent editing. During manual operation, claim writes are advisory, not atomic. Record real executor/run identifier on starting and recheck files/claims after a claim update. Stop on ambiguous overlap. One BUILDING task per actual executor, independent review and integration queues. Do not modify production or bypass branch protection.
