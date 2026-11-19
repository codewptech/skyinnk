# Skyinnk — Parallel Execution Architecture (PEA-1)

**Status:** Owner-directed process reset, 19 November 2026. Proposed repository integration via a Chat 01-governed PR. This is a delivery/execution architecture, not a replacement for the app's product, security, data or V1/V2 decisions.

**Precedence:** For task scheduling, workstream concurrency, review queues and execution escalation, PEA-1 supersedes older serial or implicit coordination habits when integrated. Protected-branch safety, file ownership, existing task claims, product scope, security and release approvals remain binding until separately changed through their authorized processes.

**Single objective:** Maximize useful concurrently delivered work while preserving protected branches, reviewable code, verified integration and owner-controlled production. An audit, open PR, architecture conversation or release dependency must never freeze unrelated work.

## A. Non-negotiable invariants

1. **Parallel build; serial safe integration.** Multiple implementation agents can work on disjoint file sets. Integration is ordered and each merge is verified.
2. **Only real dependencies block.** A task is blocked only by a documented prerequisite, an overlapping active file claim, an unsafe interface conflict, missing external input, or an explicit release/security gate. "Another team is working" is not a valid blocker.
3. **Ready work needs no new HQ permission.** Acceptance criteria, affected paths, dependencies and authorized lane are approved in the task packet. A worker may pick a next eligible task after finishing its own scoped assignment.
4. **The owner is not a courier.** GitHub issues, PRs, checks and discussion #2 carry task decisions and evidence. Agent instructions refer to them, not owner-relayed chat summaries.
5. **Tests are evidence, not review.** Codex self-testing is not independent review; a GitHub review COMMENT from a shared account is not a separately authenticated approval.
6. **No unsafe shortcuts.** No direct writes to main or development, branch-bypass use, silent agent merges, live DB/VPS/Auth0 changes, Smiley activation or spending without separate owner authority.
7. **Separate operational truth from aspiration.** Ordinary chat sessions do not continue executing when idle. A ready queue permits continuation only while a genuine running Work/Codex/agent task can act on it. GitHub alone cannot awaken a stopped chat or make separate identities from one shared account.
8. **The execution architecture is effective only as adopted.** This document is not a required CI gate until its controls are merged into the target branch and explicitly connected to CI and repository policy.

## B. Four planes, independent of historical chat names

### 1. Decision plane
- Human owner: business priorities, material scope changes, legal and educational approvals, credentials/spend, production authorization, unresolved governance exceptions.
- Architecture reviewer: safeguards approved product contracts, resolves only material tradeoffs and incompatible interface decisions. It is not a dispatcher for every task.
- Default for routine implementation is **proceed**, not ask.

### 2. Execution plane
At least three independent work queues:
- **Learning experience:** frontend, classroom, content intake, public SEO and user interactions.
- **Technical foundation:** backend, Auth0, Prisma, API, build/CI, integration and operational readiness.
- **Quality/remediation:** reproducible audit fixes, security regression, end-to-end checks, code quality and independent verification.
A fourth **architecture/governance** lane runs only when a real decision or policy change is needed. A participant can implement across a lane only if the recorded task's source ownership and file reservations permit it.

### 3. Coordination plane
GitHub issues are task packets; task issue IDs are stable identifiers. Pull requests are proposed code deliveries. Issue #2 is the brief cross-lane synchronization log, not a blocking approval queue. Branch/PR checks decide if a proposed change is safe to integrate.

### 4. Integration/release plane
A technical integrator maintains the protected development baseline and merges validated, approved, non-overlapping PRs in a deliberate sequence. Production requires a separate owner-authorized, actually enforceable release gate. Development integration never implies deployment.

## C. Task packet (the unit of parallelism)

Each executable task has these mandatory fields, captured in the issue body:
- **Outcome:** one observable deliverable, not a broad theme.
- **Lane / Workstream:** exact allowed owner role.
- **Branch:** one task branch from latest observed development SHA.
- **Scope & paths:** owned files, expected shared/hotspot files, precise reservation list.
- **Acceptance:** demonstrable pass/fail acceptance and relevant tests.
- **Dependencies:** task/PR IDs with status HARD / SOFT / NONE; enumerate real prerequisites only.
- **Risk:** ordinary / shared-interface / sensitive-governance / release-gated.
- **Current executor:** running agent/task identity if known; no fiction that a chat is active.
- **After-PR next task:** next eligible ready issue if known.
- **Escalation:** specific decision that truly cannot proceed.

Issue tracking states (machine-checkable convention, initially maintained in body/comments; labels can be layered later):
- BACKLOG → READY → CLAIMED → BUILDING → PR_OPEN → REVIEWED → INTEGRATING → VERIFIED → DONE.
- BLOCKED contains a blocker ID, owner and unblock condition; it is not a vague hold.
- EXTERNAL_APPROVAL and DEFERRED_V2 never consume an implementation slot.
- A BUILDING task whose implementation is complete can become PR_OPEN while that lane starts an unrelated READY task. Review and building are separate WIP categories.
- A task is DONE only after merge, required checks and appropriate acceptance evidence; drafting a PR is not DONE.

Never use a public checkbox or issue claim as proof of agent authentication. Checks enforce declared policy, not identity independence.

## D. Dependency graph and dispatch rules

Treat the task backlog as a directed acyclic graph of prerequisites, not one global milestone chain.

A task is **READY** if:
1. It has an approved narrow outcome and objective acceptance.
2. All HARD predecessors are DONE or its task can operate safely on an isolated documented interface.
3. Its exact changed-path claim does not collide with another active editor or open PR.
4. Its workstream has an available BUILDING slot.
5. No unresolved owner-only action is necessary to implement its scope.

SOFT dependencies do not block building; the task must record which assumption or contract it consumes and verify it during integration.

Dispatch algorithm for a running implementation agent:
1. Finish or safely checkpoint its current scoped task.
2. Publish evidence and open/update the PR.
3. Select the highest-priority READY issue in its authorized workstream with no current path collision.
4. Record claim, SHA, executor, changed paths, and start immediately using a new branch.
5. If all tasks in that lane are blocked, write one blocker with a concrete unblock condition; do not repeatedly ask HQ for general "what next?".
6. Never automatically merge, switch production branches or invent content approvals.

The ready queue should contain **at least two next eligible tasks per implementation lane** when there is known approved work. Queue replenishment is a routine technical coordination responsibility, not an owner's recurring message-writing job.

## E. WIP and throughput

- Default maximum: **one active coding branch per execution agent**, and **one active review assignment** in addition. Multiple distinct agents may build simultaneously.
- Three simultaneous implementation lanes are preferred only while they own disjoint changed-path sets or stable interfaces; do not maximize concurrency blindly.
- Each PR should be small enough for independent review and rollback. Keep architectural changes separate from feature code when possible.
- No global freeze for audits, CI, pending PRs, missing content, waiting legal approval, or pending production approval. Freeze only the exact affected path, task or environment.
- Do not overwrite open PR branches from other agents. A conflicted file requires transfer, sequencing or explicit coordination.
- Shared/hotspot path names are a mechanical integration limit, not grounds to block the whole lane.

## F. Integration conveyor

1. On PR_OPEN, continue independent development work where authorized; start a separate review assignment.
2. The integrator checks current base SHA, changed files, open-PR collisions, issue claim, task scope, safe tests, governance, reviewer findings and release impact.
3. Select one eligible PR. Refresh/reconcile its branch against current development without destructive resets or force-pushes; rerun required CI on the refreshed exact head.
4. Merge through protected-branch process **only after required review/governance conditions are satisfied**.
5. Verify the post-merge development SHA, CI and regression contract.
6. Record completion/remaining risks; advance next eligible PR immediately. If a PR fails, return only that PR to its implementer; other lanes continue.
7. After a batch of related changes, run combined integration/browser/security checks. Keep release evidence tied to immutable SHAs, not historical totals.
8. A PR from the same GitHub identity may have a useful independent source review by a second model/check, but do not mislabel this as separately authenticated GitHub approval.

## G. Interfaces and path ownership

- Prefer contract-first APIs, schemas and fixtures to unblock independent frontend/backend work.
- For cross-layer work, agree on a small versioned interface (routes, payload shape, published-content rules) and fixture tests before dependent work starts.
- A task that changes that interface identifies downstream consumers and defines a compatibility check; it does not reserve every consumer file.
- One editor at a time per conflicting path; both old and new paths count for renames.
- Preserve existing branch namespaces, issue reservations, CI and owner-only release controls until deliberate reviewed replacement.
- Do not use cross-lane autonomy to bypass tests, code ownership or genuine security questions.

## H. Decision and escalation protocol

Escalate only one of:
- Product/architecture invariant conflict or material change.
- Genuine competing ownership of the same files.
- Production, live data, secrets, ruleset/bypass, paid service or identity-control change.
- Legal/child/privacy/educator/media rights decision.
- Security finding requiring owner risk acceptance.
- HARD dependency missing and no equivalent authorized ready task.

A decision request must include: what is blocked, why, two viable options, safe default, exact affected tasks, and which other work can proceed regardless. If no owner response is available, continue other READY tasks; never infer approval for gated work.

Review requests go to relevant owner(s) without pausing builders. A reviewer may request changes on a PR; that does not stop unrelated implementation.

## I. Verification and dashboard

The permanent, minimal status record is an issue + PR + exact SHA + CI link. No separate spreadsheet or privately held chat status is authoritative.

Track:
- READY issues per lane and active agent/executor.
- BUILDING issues and branch/SHA.
- PR_OPEN, reviewer required, current check results and base lag.
- INTEGRATING candidate, post-merge CI.
- BLOCKED tasks with concrete blocker owner and age.
- Last verified development SHA; production SHA; launch gates.

Monitor indicators, not invented productivity statistics:
- Time from READY to claim.
- Completed PRs and verified milestones per week.
- PR waiting-for-review age.
- CI re-run delay after base advances.
- Blocked tasks without an independent substitute.
- Regressions attributable to overlapping writes.
- Owner questions per week; target fewer routine coordination requests.

Operational triggers: a PR older than one working day without review is highlighted; a running lane with no READY task is queue-starved; a BLOCKED task lacking a named unblock action is invalid. These are **triage alerts**, not a claim of automated enforcement until connected to a real running watchdog.

## J. Failure-mode handling

- Audit discovers a defect: create an issue in the quality lane, reserve affected paths; no global stop unless the defect makes all ongoing work unsafe.
- Dependency changes: refresh only affected PRs against current base; no blanket branch recreation.
- Failed CI: return that PR to BUILDING; other independent work continues.
- External content/legal delay: technical acceptance progresses with fictional fixtures; never publish fictional content as real.
- Identity/review gaps: record absence plainly; don't substitute shared-account AI comments for required human review.
- Agent/tool unavailable: preserve task packet and evidence; another authorized running agent may claim after explicit transfer. An idle ordinary chat is not an executor.
- Production outage: use separately approved recovery workflow; no new emergency bypass authority from this document.

## K. Initial rollout with nine open audit PRs

Existing PRs #14, #16, #18, #20, #22, #24, #26, #28 and #30 remain **PR_OPEN/under review**, not merged. The readiness of other independent tasks is unaffected. Their source files are reserved until resolution; no competing edits to these paths.

- Review conveyor: coordinate exact-head Chat 03, Work and governance review without making review a global stop. Integrate serially and re-test each updated base. Release-state record should reflect the final integrated SHA.
- Work lane: select approved UI/content/acceptance tasks that do not touch #18/#20's paths or depend on unavailable real content.
- Technical lane: select approved backend/integration/provider-acceptance tasks excluding paths reserved by #14/#16/#22/#26/#28/#30.
- Quality lane: Codex continues complete technical remediation on the existing PR branches until findings are closed; do not duplicate fixes.
- Decision lane: owner/Architecture HQ resolves release gate, legal copy and real educator-approved media as separate external approvals; these do not freeze nondependent work.
- Production stays blocked until genuine launch gates are satisfied.

## L. Enforceability map and installation order

### Immediately operational
- One GitHub issue per task, exact workstream/branch/reservation, independent ready backlog, issue #2 coordination, separate review and build queues, blocked reason, existing protected branches and CI.
- The supplied task template makes packets consistent but does not by itself start an agent or create a mandatory check.
- Owner directive: workstreams can independently choose the next READY, nonconflicting approved task while running.

### Requires reviewed integration
- This document and template must be merged through a Chat 01-owned PR into development. Until then they are a proposed source-controlled contract.
- Changes to AGENTS.md or active governance script belong in a **later clean, reviewed governance PR after PR #24**, not an overlapping concurrent PR.
- Machine-enforced dependency/task-state rules require a separately reviewed, versioned policy validator integrated into Development CI **after PR #22** changes the workflow. It must verify declared GitHub issue metadata with the right read-only permissions; guard against self-editing of checks and evaluate renames/overlaps. No forced change to a live ruleset.
- GH issue event automation on a default branch or persistent agent/automation runtime requires explicit rollout and appropriate permissions. Do not pretend that adding a file to development activates it for default-branch issue events.

### Separately authorized
- Production/main deployment controls, required-review changes, separate GitHub identities, enabling Smiley, spending and live environment operations.

**Acceptance test for the architecture:** while nine remediation PRs remain under review, a separate eligible learning or backend task must be claimable and able to produce a reviewed PR without waiting for the audit batch. If this cannot happen, identify the *specific* missing execution runtime, dependency or file reservation and correct that bottleneck—do not write another generalized plan.

**This contract establishes delegation of routine execution, not an unbounded authorization to change protected code or production.**
