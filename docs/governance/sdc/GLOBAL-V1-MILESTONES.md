# SDC — ONE Global Skyinnk V1 Milestone Register

**State:** Canonical global V1 guest-learning milestone already exists as [GitHub Issue #58](https://github.com/codewptech/skyinnk/issues/58), ID **V1-58**. This document defines the index/ID rule, not a separate milestone database. Live GitHub issue/PR/commit evidence takes precedence over old snapshots. Do not invent completion, scope or version numbers.

## Baseline snapshot (2026-11-20; refresh from live GitHub before use)
- Protected integration branch: `development/v1-public-launch`.
- Verified integration HEAD at draft start: `f318ceb5f5144116c2b59a43298336438910de69` (refresh every session).
- GitHub-native PEA-2 CI via merged PR #51, Issue #34 closed. This is a **governance technical milestone**, not proof the entire V1 app passed user acceptance.
- The sole current **global milestone V1-58** is [Issue #58, guest course discovery through a complete public lesson](https://github.com/codewptech/skyinnk/issues/58), already linking GitHub Issues #35 (public course discovery, Work) and #36 (public read API contract, PEA-2 Chat 03), among other corrections. These are **subtasks**, not separate milestones. A milestone's status must be read from the current issue and integration evidence.
- Multiple open legacy audit/remediation PRs require exact-head/current-base checks; see Review Box.
- No human review or production release approval implied.

## Template for EVERY global V1 milestone
```markdown
Global milestone ID: V1-<canonical GitHub issue number; only SDC 03 creates/reuses the record>
Title:
Approved V1 outcome:
In scope:
Explicitly out of scope:
Prerequisites and interface contracts:
Acceptance scenarios (including negative cases):
Contributing chats: 02 / 04 / 05 / 06 (as applicable)
Reviewer: 03
Current SDC state:
CURRENT / QUEUED work orders, with links:
Linked PEA-2 task issue and PR:
Latest verified development SHA:
Latest full/affected audit evidence:
Mode A / B / D / E evidence:
Laptop-ready revision and run procedure:
Optional owner feedback (environment and tested SHA):
Exceptions / unresolved owner approvals:
Next global milestone candidate:
```

## Global ID creation and concurrency

- SDC 03 is the one allocator. Before minting any milestone, query existing global V1 milestone issues and task/PR links for duplicates. One product-outcome issue corresponds to one canonical ID `V1-<GitHub issue number>`; never use separate frontend/backend/chat numbering.
- While a candidate is unallocated, refer to it by plain candidate title and linked existing work (for example, `candidate:guest-learning; tasks #35/#36`). No other chat creates a competing number; obtain the GitHub issue number from SDC 03.
- SDC 03 must keep the current milestone, one **NEXT READY** and a **FOLLOWING** candidate where justified by approved V1 scope. Do not create milestones solely to keep agents busy; processing already queued fixes outranks starting a new milestone.
- A GitHub update does not awaken dormant Codex/Work. Near-continuous transitions require verified actual runtime execution; scheduled checks are fallback, not throughput clocks. [Issue #59](https://github.com/codewptech/skyinnk/issues/59) tracks real execution acceptance.

## Shared scheduling semantics
- Milestone ID describes the **product outcome**, not frontend/backend or chat ownership.
- Multiple global milestones may overlap in BUILDING/REVIEWING; each actual executor finishes its CURRENT work first and queues Reviewer corrections second.
- A frozen revision may remain available to owner's flexible human review; feedback against older versions must be reconciled against latest code before writing a fix.
- `TECHNICALLY_VERIFIED` does not mean `ACCEPTED_BY_OWNER`, and neither is production authorization.
- The first concrete canonical global milestone already exists as **V1-58**. Continue its existing CURRENT and CORRECTIONS_QUEUED work; do not recreate it.
