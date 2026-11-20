# SDC — ONE Global Skyinnk V1 Milestone Register

**State:** Registry initialized; individual global milestone sequence **not yet defined by repository-verified plan**. Do not invent success, scope, dates or milestone numbers. This register becomes authoritative for V1 delivery only after the Review Director reconciles approved scope and live repo evidence.

## Baseline verified when this charter was drafted (2026-11-20)
- Protected integration branch: `development/v1-public-launch`.
- Verified integration HEAD at draft start: `f318ceb5f5144116c2b59a43298336438910de69` (refresh every session).
- GitHub-native PEA-2 CI via merged PR #51, Issue #34 closed. This is a **governance technical milestone**, not proof the entire V1 app passed user acceptance.
- Active readiness candidates: GitHub Issues #35 (public course discovery, Work) and #36 (public read API contract, PEA-2 Chat 03). These are **tasks** that could contribute to ONE global guest-learning milestone, not isolated numbered milestones.
- Multiple open legacy audit/remediation PRs require exact-head/current-base checks; see Review Box.
- No human review or production release approval implied.

## Template for EVERY global V1 milestone
```markdown
Global milestone ID: M-<globally allocated ID>
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

## Shared scheduling semantics
- Milestone ID describes the **product outcome**, not frontend/backend or chat ownership.
- Multiple global milestones may overlap in BUILDING/REVIEWING; each actual executor finishes its CURRENT work first and queues Reviewer corrections second.
- A frozen revision may remain available to owner's flexible human review; feedback against older versions must be reconciled against latest code before writing a fix.
- `TECHNICALLY_VERIFIED` does not mean `ACCEPTED_BY_OWNER`, and neither is production authorization.
- During bootstrap, Reviewer may recommend the first concrete global V1 milestone by aggregating Issues #35/#36 and relevant approved requirements. Record explicit scope before declaring it active.
