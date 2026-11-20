# SDC Operating Contract v1 — Whole Skyinnk V1

## 0. Separation of authority
- **SDC** manages chats, the ONE global V1 milestone roadmap, review feedback, work queues, remediation cycles and laptop-ready builds.
- **PEA-2** manages task-claim validity, source ownership, permitted branch namespaces, shared paths, dependencies, CI, approved integrations and authenticated protections. Read `AGENTS.md`, `docs/governance/DEVELOPMENT-WORKFLOW.md`, Issue #2 and the PEA-2 task template before touching code.
- A conversation role is NOT a GitHub `Workstream:` value or authenticated executor identity.
- SDC introduces no new service, hosted claim broker, GitHub governance App, GitHub ruleset changes, privileged credential, production approval or new CI check. Existing controls remain in force.
- No production/main, live data/migrations, destructive changes, force/bypass, ruleset/credential changes or spending without specific owner approval. Normal non-production integration still needs scoped authority, source review and passing protected CI.

## 1. Six entirely NEW conversations
| New chat | Role | Writes code? | Primary output |
|---|---|---|---|
| 01 Architecture Authority | V1 design/boundaries, material security/data rules, exceptional decisions | Only on approved governance tasks | Bounded decisions |
| 02 Experience Engineer + Architect | Whole-V1 UI, interaction, accessibility, approved wording and UX specification | Yes, frontend | Tested UX/source PR |
| 03 **Independent Review Director** | Global milestone audits, exact-head PR reviews, human feedback intake, issues/queue routing, re-audit, optional readiness feedback | **No reviewed implementation writes** | Audit dossier, issues, verdict |
| 04 Systems Engineer | Whole-V1 backend, APIs, Auth0, Prisma, data integrity, application security implementation | Yes, technical | Tested systems PR |
| 05 Repair & Refactoring Engineer | Verified defects, regressions, targeted refactors and justified rewrites, across V1 by path-owner approval | Yes, only within actual permitted lane | Regression-backed repair PR |
| 06 Integration & Build Engineer | Reviewed non-production integration within owner-granted scope, CI, compatibility, exact laptop-run build, release evidence | Only in permitted technical integration lane | Reproducible tested milestone build |

No seventh permanent chat. The Reviewer is the normal owner-facing conversation. Chat 01 decides exceptional architectural changes; Chat 02 absorbs UX-architecture work in addition to frontend implementation.

### PEA-2 identity mapping (critical; don't alter policy silently)
- SDC **01** governance implementation -> existing PEA-2 **`Chat 01`**, `chat01/task-*`.
- SDC **02** UX/frontend implementation -> existing PEA-2 **`Work`**, `work/task-*`.
- SDC **04** backend/systems implementation -> existing PEA-2 **`Chat 03`**, `chat03/task-*`.
- SDC **05** repair -> the **actual affected path's** PEA-2 owner: `Work`, `Chat 03`, or `Chat 01`; no `repair/*` namespace. If another task claims path, queue and coordinate.
- SDC **06** integration technical implementation -> existing PEA-2 **`Chat 03`** when permitted; reviewer/merge steward role does not grant a bypass.
- SDC **03** is independent read-only Reviewer; it may write issues, comments and technical reviews but cannot impersonate an independent GitHub identity if agents share credentials.

Old tickets naming “Chat 03” or “Work” refer to the old **GitHub workstream**, not necessarily the new numbered chat. Reconcile active tasks before onboarding. Changing governance enforcement is a separate reviewed policy PR.

## 2. One GLOBAL V1 milestone roadmap
- There are no frontend/backend/chat-specific milestone number series. Each global V1 milestone spans whatever application layers its accepted outcome requires.
- One milestone ID, outcome, acceptance criteria, dependencies, scope boundary, owner-approved decisions, revision evidence, linked issues/PRs and human comments.
- A milestone can receive work from Chats 02/04/05/06 simultaneously without becoming four separate milestones.
- Milestone states: `PLANNED`, `BUILDING`, `REVIEWING`, `CORRECTIONS_QUEUED`, `INTEGRATING`, `TECHNICALLY_VERIFIED`, `HUMAN_FEEDBACK_RECEIVED`, `ACCEPTED_BY_OWNER`, `BLOCKED`. Technically verified does NOT assert owner acceptance or deployment.
- Never invent a milestone ID, claim completion from a PR alone, or move a global milestone backward merely because some later optional polish is queued. Use revision-linked findings or follow-up corrections.
- At the start of every session read the same milestone registry, live issues/PRs and exact development SHA. Keep all significant changes in GitHub.

## 3. Individual chat work queues — non-preemptive
Each active chat must separately track **CURRENT**, **QUEUED REVIEWER CORRECTIONS**, **QUEUED GLOBAL MILESTONE WORK**, and **BLOCKED/REVIEW BOX**. Every work item identifies milestone, issue, branch/PR, owner, dependencies, exact paths and acceptance.

**Default selection policy:**
1. Finish the CURRENT committed assignment to its genuine handoff point (tests and scoped PR/evidence, or completion of a review/integration).
2. Then take oldest eligible mandatory REVIEWER corrections, in risk/priority order.
3. Then start the next eligible assignment in the ONE global V1 milestone roadmap.
4. Optional cleanup last.

A newly arriving request is logged, deduplicated, checked for dependency/conflict and QUEUED—not an instruction to interrupt current work. Never start a new global milestone to starve known mandatory fixes. Critical exploitable vulnerability, active data loss, severe integrity incident or owner-directed emergency can preempt: checkpoint and stop unsafe work, record why. A stalled current assignment becomes `BLOCKED` with evidence, not silently “finished”; another non-conflicting eligible task may then run. Open PRs retain file claims until released/integrated.

Every role independently evaluates readiness and work selection; the Reviewer routes but does not micromanage execution order. Only a real active executor session performs work. A dormant chat does not wake itself because an issue was assigned; report actual liveness/run identity.

## 4. Review Director modes — distinct
- **A — GLOBAL MILESTONE REVIEW:** scrutinize the named whole-V1 milestone across every affected layer and contract; inspect dependencies/regression boundary. NOT a compulsory entire-repo audit each time.
- **B — EXACT-HEAD PR/CHANGE REVIEW:** inspect diff, code, tests, changed path claims, cross-layer compatibility, CI and regressions. Review must match actual head SHA; advisory review is not authenticated independent GitHub identity.
- **C — FLEXIBLE HUMAN FEEDBACK ANALYSIS:** owner can review ANY available identified build at ANY time, with no required milestone review gate. Convert observational UI, wording, functionality, content, performance, UX, refactor/rewrite input into grounded, deduplicated linked issues. Never assume user's root-cause guess is verified.
- **D — UPDATED MILESTONE RE-AUDIT:** after corrections are integrated, verify original findings, affected regression matrix, new tests and milestone status, then send corrections back if required.
- **E — COMPREHENSIVE WHOLE-V1 REPOSITORY AUDIT:** broad source, architecture, API, Auth0, Prisma, security, supply chain, tests, UI/a11y, runtime/build, docs and launch risks, at designated major checkpoints, high-risk changes and V1 release readiness. State evidence limits. Not mandatory after every tiny edit.

**Quality loop:** Milestone build -> Mode A/B -> findings -> queue -> engineering corrections -> authorized integration -> Mode D -> more findings as needed. Mode E at checkpoints. Owner's Mode C is **asynchronous and optional**; no mandatory human checkpoint between technical milestones. Unresolved production gates stay owner-controlled.

Reviewer doesn't write code it later reviews; material UX decisions go to Chat 02, material architecture to Chat 01. Fix, refactor and rewrite should be evidence-based; avoid wholesale speculative rewrite.

## 5. Shared GitHub handoff
Create/maintain a canonical GitHub GLOBAL milestone issue/record, linked PEA-2 task issues, task PRs, exact head/base SHAs, test evidence, reviewer findings and a queue section per role. New PEA-2 task issues must use the exact current template and valid actual `Workstream:`/branch namespace; start BACKLOG and promote to READY only when verified. A milestone label is not enough for execution. Protect active claims and both sides of renames.

Every handoff: `Global milestone`, `Source finding / tested SHA`, `Owning role`, `PEA-2 workstream`, `Acceptance`, `Dependencies`, `Affected paths`, `Queue position`, `Evidence`. Avoid tagging dormant chats as if that activates them.

## 6. Integration and laptop review
Integrator completes one protected non-production merge at a time only within specifically approved owner scope and current review/CI requirements. Capture exact merged development SHA; verify post-merge push CI and affected contracts. Prepare a reproducible laptop setup with safe fictional/approved content, start/stop commands and limitations, without presuming actual user's OS/credentials. Reviewer verifies the package evidence before declaring `TECHNICALLY_VERIFIED`. Owner may test ANY prior or current frozen SHA whenever desired and submit informal feedback; attach actual SHA/environment. Owner acceptance is not required for ordinary ongoing development; it remains separate from legally/security/release-gated approvals and release to main.

## 7. Legacy chat migration
ALL six numbered roles start as **new conversations**. Old conversations are historical references, never automatically re-designated. Classify legacy chats as `KEEP AS REFERENCE`, `REVIEW BOX`, or `SAFE TO ARCHIVE AFTER HANDOFF`. Do not declare irreversible deletion safe without verifying unique source, outstanding decisions and completed handoff. Do not delete historical GitHub PRs/issues. Full inventory of user's conversations is not available to repository tools. See [Review Box](REVIEW-BOX.md).
