# Skyinnk — Parallel Delivery Operating System (PEA-2)

**Status:** Revised execution architecture, 19 November 2026; implementation proposed in PR #32, not active across GitHub until merged and independently verified.
**Authority:** Owner's execution reset. Supersedes previous _serial scheduling habits_, not the approved Skyinnk product ADL, V1/V2 release scope, existing file/role protections, or owner's production restrictions.
**Goal:** Keep useful, compatible implementation, independent review and integration moving simultaneously. Remove the owner as a routine dispatcher.

## 1. Hard separation: product, policy, scheduling and execution

The product architecture defines _what Skyinnk must do_. PEA-2 defines _how approved work is delivered_. The existing mandatory repository governance remains enforceable until a separately reviewed CI change replaces it. A policy document cannot start an agent, create a protected GitHub identity, change a branch ruleset, or guarantee that a submitted issue is actually executable.

Four independent planes:

1. **Decision:** owner approves material product changes, real lesson content/media rights, legal text, spending, identities, production and live data. Architecture reviewer resolves genuine conflicts. Routine implementation proceeds without owner approval when scoped and safe.
2. **Dispatch:** a ready-task registry, verified dependency graph, claim coordinator, executor adapters, and task event log. This plane is **partly specified, not yet deployed**; the immediate manual GitHub procedure is described below.
3. **Execution:** Learning Experience, Technical Foundation and Quality/Remediation queues, with distinct _code ownership roles_. Running agents implement independent tasks concurrently.
4. **Review/integration:** independent review pool and a single ordered non-production integration conveyor; production has a separate owner-enforced release gate.

A **lane** describes delivery purpose, a **Workstream** determines source-path permissions, and an **Executor** is a verifiable actual running task/session. They are different identities and must not be conflated.

| Delivery lane        | Typical work                                                           | Valid code ownership                                      |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Learning Experience  | Catalogue, course pages, classroom, browser acceptance, content intake | Work                                                      |
| Technical Foundation | APIs, Auth0, Prisma, CI, integration and runtime acceptance            | Chat 03                                                   |
| Quality/Remediation  | Audit, reproductions, security and regression work                     | Work / Chat 03 / Chat 01 according to exact changed files |
| Governance           | Architecture and policy code                                           | Chat 01                                                   |

No invented `quality/*` branch: existing CI accepts `work/task-*`, `chat03/task-*` and `chat01/task-*` only. An independent auditor may review any lane read-only; an auditor implementing a fix must use an authorized owner-role task and review route.

## 2. Guaranteed versus advisory controls

| Control                                                                                                    | Current guarantee                                                                           | Target verification                                                    |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Protected main/development branches and required Development CI                                            | Existing active repository rulesets                                                         | Read effective GitHub settings and commit checks                       |
| Task branch namespace, declared issue, workstream role, exact shared reservations and open-PR path overlap | Existing Development CI, only after PR exists                                               | Check current merged `scripts/verify-pr-governance.mjs`                |
| Concurrency among multiple unpublished implementation branches                                             | **NOT enforced**: PR-only checker sees neither unpublished edits nor task claims atomically | Dispatcher grants exclusive atomic leases before work                  |
| READY task and dependency validation                                                                       | **Advisory issue metadata only** until follow-on issue #33/#34 merges                       | Policy tests and live invalid/valid PR acceptance                      |
| Start/resume Work or Codex tasks automatically                                                             | **NOT available merely from GitHub issues or ordinary chat instructions**                   | Connected supported execution adapter logs a real start and completion |
| Human-independent reviewer authentication                                                                  | **NOT established** with agents sharing owner GitHub identity                               | Separate approved credentials and actual GitHub review metadata        |
| Non-production serial integration                                                                          | Procedural, current technical steward                                                       | Actual reviewed merge + post-merge CI                                  |
| Owner-only production release                                                                              | Separate approval needed; current live deploy is still push-triggered                       | Owner-controlled enforceable release mechanism, separately authorized  |

Do not claim "fully enforced", "running agents" or "reviewed" when only a document, issue comment, self-test or owner-linked AI review exists.

## 3. Task packet: smallest authorized unit of work

Every **new PEA-2** task must contain these typed, unambiguous fields (historical open issues retain the old contract until migrated deliberately):

- `Workstream:` exact `Work`, `Chat 03` or `Chat 01`.
- `Branch:` exact role-matching `work/task-...`, `chat03/task-...`, `chat01/task-...`.
- `Target:` `development/v1-public-launch`.
- `Delivery lane:` one of the four lane names in section 1.
- `Priority:` `P0`, `P1`, `P2`, or `P3`. P0 = urgent safety, P1 = launch-critical, P2 = committed enablement, P3 = optional quality; never fabricate urgency.
- `Execution state:` one canonical state from section 4. New issues always start as `BACKLOG` until validated; READY is not the default.
- `Risk:` `ordinary`, `shared-interface`, `sensitive-governance`, `release-gated`.
- `Executor:` actual task/run ID with tool or `unclaimed`. Do not put a chat name here and pretend it is working.
- `Claim lease:` timestamp, expiry and claim generation ID **only after a capable claim broker grants it**; otherwise `none / advisory`.
- `Start dependencies:` #issue IDs or `none`; must be DONE before execution can begin.
- `Integration dependencies:` #PR/issue IDs or `none`; may allow isolated contract-based development but block merging until verified.
- `Soft dependencies:` #IDs or `none`, with downstream compatibility checks.
- `External approvals:` named owner-controlled condition(s), with exact blockable scope.
- `Owned / affected paths:` one exact backtick-quoted path per dash bullet. Include planned changes and both paths of a rename.
- `Reserved shared paths:` use the same exact bullet format for shared paths, or a single `None.` line. Both path sections reject prose, annotations, and malformed entries.
- `Outcome:` one observable deliverable, acceptance checks and downstream interface implications.
- `Next eligible task:` optional candidate; cannot override readiness validation.
- `Blocking decision:` only if state is BLOCKED; identify blocker issue/actor, reason and unblock criterion.

Invalid or placeholder packets remain BACKLOG. A status label alone is not authoritative. The existing PR checker still evaluates its historical syntax during migration: leave the exact Workstream, Branch, task-issue line and reservation heading intact.

## 4. State machine and honest source of truth

| State                | Entered when                                                                                     | Next valid states                                    |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| BACKLOG              | Packet created or incomplete                                                                     | READY, DEFERRED, CANCELLED                           |
| READY                | Validated, start prerequisites resolved, non-colliding claim available, authorized               | CLAIMED, BLOCKED, DEFERRED, CANCELLED                |
| CLAIMED              | Claim broker or explicitly documented **advisory** manual coordinator assigns executor and paths | BUILDING, PAUSED, READY (release), BLOCKED           |
| BUILDING             | Executor is actually active and has branch/claim evidence                                        | PR_OPEN, PAUSED, BLOCKED, CLAIMED, CANCELLED         |
| PR_OPEN              | A real task PR is open with exact head SHA                                                       | REVIEWING, CHANGES_REQUESTED, BLOCKED                |
| REVIEWING            | Independent reviewer examining exact head                                                        | READY_TO_INTEGRATE, CHANGES_REQUESTED, BLOCKED       |
| CHANGES_REQUESTED    | Review or exact-head CI rejects code                                                             | BUILDING, BLOCKED                                    |
| READY_TO_INTEGRATE   | Required technical review and checks accepted for current head/base                              | INTEGRATING, CHANGES_REQUESTED                       |
| INTEGRATING          | Integration steward has locked one candidate, reconciled base and begun normal PR merge          | VERIFIED, CHANGES_REQUESTED, BLOCKED                 |
| VERIFIED             | Merge commit exists, post-merge development CI and relevant regression acceptance pass           | DONE, CHANGES_REQUESTED                              |
| DONE                 | Verified non-production delivery recorded, issue closed                                          | REOPENED when new evidence invalidates result        |
| BLOCKED              | Named missing condition, actor and unblock trigger exists                                        | READY, BUILDING, PR_OPEN, REVIEWING after validation |
| PAUSED               | Executor is unavailable; claim and source evidence preserved pending explicit resume or transfer | CLAIMED, BUILDING, BLOCKED, CANCELLED                |
| DEFERRED / CANCELLED | Explicit authorized disposition                                                                  | BACKLOG only after owner/role reauthorization        |
| REOPENED             | Previously DONE task invalidated                                                                 | BACKLOG, READY                                       |

State is **not** derived only from mutable issue-body text. Target architecture reconciles issue claim + task executor/run + current branch SHA + linked PR state + current check conclusions + integration SHA. An issue never has to remain READY after it gains a PR. Recheck current GitHub state before transition; transition writes must be idempotent and reject stale generation numbers.

During manual operation, GitHub issue body is the proposed intent; linked PR/CI/branch SHA is the evidence of actual progress. If these disagree, classify `NEEDS_RECONCILIATION` and avoid silently marking DONE.

## 5. Dependencies: no loopholes

- **START:** a true execution prerequisite. If it is not DONE, task is NOT READY. There is no "unless isolated" exception.
- **INTEGRATION:** allows isolated code/test fixture work against an agreed stable contract, but blocks integration until the predecessor is DONE and compatibility tests pass.
- **SOFT:** optional/non-blocking assumption; explicitly revalidate consumers when upstream changes.
- **EXTERNAL APPROVAL:** may gate publication, production or legal claims without blocking unrelated fictional-fixture development.

Reject self-dependencies, missing/closed-without-success prerequisites, cycles and invalid cross-reference types. If upstream is reopened or fails, dependent tasks awaiting integration lose READY_TO_INTEGRATE and are rechecked; already merged dependents become follow-up defect tasks rather than rewritten history. A successfully merged PR is not DONE until post-merge CI and acceptance pass. Never silently waive a START or INTEGRATION prerequisite.

## 6. Priority, WIP and fairness

Dispatch eligible READY tasks deterministically by `Priority (P0→P3)`, then declared dependency-unlock value (number of waiting committed tasks), then issue creation time, then issue number. Do not favor a lane because someone spoke last in HQ.

- Maximum **one active BUILDING task per actual executor** and at most one additional review task; a whole delivery lane may use several separate actual executors if claims are disjoint.
- **One integrator** advances one PR merge at a time. Reviewers do not stop builders.
- Keep one next READY substitute for each genuinely active lane, preferably two when real approved work exists. Do not invent filler work or call a lane active when no executor exists.
- A PR in review releases its builder's execution slot but retains claimed changed paths until integrated/closed or explicitly transferred.
- Unreviewed PR age > 1 working day = escalation to review-pool coordinator, **not** owner by default.
- If an agent is inactive, blocked, at usage limit or missing, **no automatic progress is implied**.

Track actual throughput: ready-to-claim time, branch-to-PR time, review wait, merge wait, real post-merge success, paths in contention and owner interventions. PR count is not throughput.

## 7. Path claiming and transaction safety

### Immediate mode — advisory, non-atomic

Before editing, an active agent must:

1. Read current development SHA, open task issues (including CLAIMED/BUILDING/PR_OPEN), open PR file lists and both previous/new rename paths.
2. Check exact changed paths plus all known shared files against other active claims and PRs.
3. Write claim identity, task link, branch, paths and heartbeat timestamp to its issue; re-read the active claims and PRs before starting.
4. If overlap or concurrent claim ambiguity is seen, **do not write** those files. Transfer ownership explicitly, narrow scope or pick another READY task.
5. Recheck claims immediately before opening a PR. CI's PR overlap check remains a final guard, not a substitute for pre-PR coordination.

**This process is best-effort only.** Two agents can win a race between read and write. GitHub issue comments, timestamps and Markdown edits do not provide an atomic lock. Do not claim atomic exclusivity today.

### Target mode — one claim authority with atomic leases

Introduce a serialized dispatcher/broker with durable versioned task state and first-writer-wins acquisition of ordered path keys. All leases must include task ID, executor ID, branch, exact paths, lease generation and expiry. If an all-path acquisition fails, release partial claims safely and deny start. Integrate both active unpublished leases and open-PR touched filenames into collision checks. Heartbeats extend only the current generation. On expiry, mark **SUSPECT** and stop new writes; require safe repository reconciliation and human/authorized transfer before granting a conflicting lease. Expiry alone must **never** authorize overwriting another agent's unpublished work.

A broker might be implemented with an approved GitHub-backed serialized workflow/ref-lock approach, or a supported managed agent runtime with documented atomic operations. **Do not claim a feasible broker merely because GitHub issues can be edited.** Validate the actual API atomicity, authentication scopes, race tests, expiry and crash recovery before activation. No extra hosting/spend or owner bypass is authorized here.

## 8. Execution adapters and uninterrupted lanes

An execution adapter is a real supported connector to a running agent environment. Its contract:

1. `start(issue, repo, baseSHA, paths, acceptance, claimGeneration)` returns a genuine run ID; the adapter confirms the agent began the task.
2. `heartbeat(runID)` proves liveness and claim ownership without granting unrelated privileges.
3. `checkpoint(runID, evidence, headSHA)` records test/PR state and releases only appropriate execution slots.
4. `complete(runID, PR, evidence)` moves the task to review.
5. `fail(runID, reason)` places task in BLOCKED/PAUSED with recoverable evidence, never silently discards changes.

Adapters may be built for Work/Codex **only where a real supported launch and status API is connected and authorized**. A GitHub issue cannot wake a dormant chat, and an automation that reports queue health does not execute code. Do not invent a Codex/Work API endpoint or say runs have started without a recorded run ID.

**Immediately usable fallback:** owner or an authorized active agent initiates one long-running, scoped Work/Codex task per lane with the ready queue and standing handoff instructions; each running task proceeds to the next non-colliding READY issue while allowed, rather than asking the owner at every milestone. This removes _repeated_ messages but not the initial execution kickoff. Account usage limits and session termination are genuine pauses. Maintain one independent agent per code lane where possible.

## 9. Review factory and non-production integration conveyor

Review is a staffed separate work queue, not an implicit step after every other task finishes:

1. On PR_OPEN, attach exact head/base SHA, issue, changed paths, affected contract, tests and review categories. A review coordinator assigns a relevant actual reviewer; an already-running agent can inspect a different lane without modifying its branch.
2. Reviewer examines source and relevant tests, records findings for the **exact head** and chooses `CHANGES_REQUESTED` or `TECHNICALLY_ACCEPTABLE`. An AI under the shared owner GitHub account must label this **advisory technical review**, not an independently authenticated GitHub approval.
3. The integrator independently checks changed files, active leases/open PRs, current required CI, task approvals and blockers. Select a single candidate, reconcile its branch with latest development **without force-push/resetting others' work**, rerun exact-head CI.
4. Normal non-production merge only after applicable technical review and existing protection rules. If the required independent review cannot be authenticated, record limitation and do not assert it occurred. Escalate only if a material policy decision is needed.
5. Verify post-merge SHA, required CI and regression/integration acceptance; mark DONE only then. Recompute dependent task eligibility and queue next candidate. A failed candidate returns only that PR to implementation/review; independent lanes continue.

**No silent auto-merge** and no production/main action. More coding PRs without actual review and merge capacity increases lead time. Track review capacity explicitly; queue > 1 working day without a review assignment is a coordinator alert.

## 10. Coordination and escalation

GitHub issue #2 is the brief sync ledger; individual issue and PR record is the actual work evidence. No separate manually maintained spreadsheet and no reliance on ChatGPT memory as operational truth.

Escalate to owner _only_ for material product architecture conflicts, real student/guardian/privacy decisions, content/media rights, legal approval, spending, live resources, production authorization, credential/identity/ruleset changes or an unresolvable task-claim conflict. A request must state exact impacted tasks, two viable choices, default safe action and which other lanes continue.

Use contract-first fixtures for independent frontend/API work. Do not block all work because real Class 10 content, legal copy, live Auth0, Smiley activation or production release is pending; these remain clearly separate launch-critical paths. No new V2 scope.

## 11. Rollout, current queue and migration compatibility

**Current observed baseline (19 Nov 2026):** development `c1250c4`; nine audit PRs #14/#16/#18/#20/#22/#24/#26/#28/#30 under review. PR #32 proposes this architecture. Ready tasks #35 (Work guest course discovery) and #36 (Chat 03 public API HTTP) are unclaimed, and **no independent agent start has been proved**. Codex remains the intended technical implementer for the nine audit remediation PRs, subject to genuine running-task availability.

**Phase 0 — this PR:** approve architecture semantics, template and isolated pure policy model with regression tests, without changing currently reserved governance/CI files. Historical issues and open PRs remain valid and must not break from a new mandatory packet format.

**Phase 1 — policy after existing PRs:** issue #33 integrates the reviewed pure module into active `AGENTS.md`, development workflow, governance checker and required tests after #24 and #32. Preserve historical issue compatibility and reject incomplete new PEA-2 packets.

**Phase 2 — CI after policy:** issue #34 integrates validated task-state/dependency checks into required Development CI after #22/#33/#32; must use read-only GitHub scopes, fail closed on real violations, and never claim it can see unpublished competing edits without a broker.

**Phase 3 — dispatch/lease and reviewer operation:** separately scope a real executor adapter and safe claim broker, with explicit permission/cost/feasibility gate. In the meantime operate manual advisory claims and visibly staffed review/integration. Do not activate hosted Smiley or purchase infrastructure.

**Phase 4 — concurrent pilot:** while Codex maintains its legitimate remediation PRs, start real Work #35 and Chat 03 #36 tasks in separate agent runtimes where supported. Require timestamps/run IDs/paths. Both produce exact-head CI PRs with no overlap; assign genuine technical reviewers concurrently; integrate at least one approved PR and record post-merge CI. Record owner interventions, review and merge waiting time. **The system does not pass this acceptance test simply because two issues exist.**

**Rollout completion criteria:** (a) contract merged, (b) issue/task policy + CI checks effective and tested, (c) actual conflict-free concurrent execution observed, (d) reviews occur without owner relaying every step, (e) ordered integration passes post-merge checks, and (f) no unauthorized production writes. Publish status as `DESIGNED`, `DOCUMENTED`, `CI_ENFORCED`, `EXECUTING` and `PILOT_VERIFIED` separately.

### Stage-zero executable model (not a live dispatcher)

This PR additionally includes `docs/governance/parallel-task-policy.mjs` and `docs/governance/parallel-task-policy.test.mjs`. It is a **pure, non-mutating policy prototype**, intended to be integrated into mandatory governance/CI by #33/#34 after the existing active PR owners finish. It does not call GitHub, lock task paths, start agents, merge branches or change settings.

The module implements packet parsing, role/branch/lane/priority checks, exact task-path declarations, START/INTEGRATION/SOFT parsing, state transitions, deterministic queue order (including ISO timestamps), dependency graph/cycle detection, detection of overlapping active claims and PR renamed paths, and integration readiness requiring CI/review evidence for the **current immutable PR head** and current development base. A caller cannot substitute stale generic pass flags for SHA-bound evidence.

Execute the optional focused regression suite with:

```sh
node --test docs/governance/parallel-task-policy.test.mjs
```

The existing `npm run test:all` glob covers `tests/*.test.mjs` only. Thus **existing required Development CI does not run this optional new suite**, and a green GitHub check today must not be reported as proof that these new policy regressions ran in CI. They become mandatory only when #33/#34 wire them into a governed workflow without overlapping #24/#22. Manual execution evidence and test runner versions must be recorded truthfully.

This helper is a preflight analysis model, **not an atomic claim authority**. Because issue metadata can be forged or changed mid-read, it must not be treated as a secure independent identity or as a lock. Trusted GitHub reads, actor/permission separation and a demonstrably atomic broker are separate tasks (#37). Exact PR-head review metadata in the prototype is a technical review signal, not proof of independently authenticated GitHub approval.

## 12. Failure handling

- Unavailable execution agent: record PAUSED, preserve branch/evidence and make next READY task available to another **real** executor; do not invent background progress.
- Claim lease expiry: reconcile live unpublished branch/PR before transferring; no automatic takeover.
- Failed CI or reviewer rejection: back to CHANGES_REQUESTED; other tasks continue.
- Upstream dependency invalidated: reevaluate dependent state; do not erase previously verified commits.
- Race/duplicate job: idempotent transition by issue+generation+head; stale writes rejected.
- External content/legal blocked: proceed with fictional, rights-safe isolated fixtures; no false launch-ready claims.
- Security incident affecting shared infrastructure: owner can authorize **targeted** freeze; document scope and release condition.
- Production/release: separate approved procedures; no auto-release, bypass, live Neon migrations or modification of VPS.

**Governing principle:** independence is the default, blocking is narrow, evidence is tied to real runs and commits, and unimplemented autonomy is never presented as operational.
