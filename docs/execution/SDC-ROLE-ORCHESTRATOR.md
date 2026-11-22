# Skyinnk — Original SDC Six-Role Coordination Controller

**Status: implementation candidate only; NOT an active multi-chat dispatcher.** Authority: the integrated original `docs/governance/sdc/OPERATING-CONTRACT.md` (SDC Operating Contract v1), `AGENTS.md`, PEA-2 workflow, Issue #2, one global V1 milestone #58, runtime #59 and implementation task #62. Do not replace, fork or extend the approved six-role architecture.

## Mission — coordinate, do not code

The controller manages the six **existing** conversations: SDC 01 (Architecture), SDC 02 (Experience), SDC 03 (independent review), SDC 04 (Systems), SDC 05 (repairs under actual file owner), SDC 06 (serial integration), plus a separately scoped Repository Steward for cleanup. SDC 05 receives mandatory reviewer-correction assignments and operates with the **existing Work/Chat 03 source owner's PEA-2 branch and exact path claims**, never inventing its own coding identity. It **must not invoke Codex, edit features, replace an SDC chat, merge PRs, authenticate as an AI chat, or claim that an issue/comment awakens an idle agent.**

Issue #60 and closed PR #61 were the incorrect local `codex exec` worker design and must never be integrated. Their audit history remains in GitHub; the new implementation begins on a new feature branch.

## Real dispatch vs planned work

GitHub Actions may run this read-only script on **development-targeted pull request and development push** signals and publish a task routing **artifact**. Issue/review/CI-completion and manual workflow events are not claimed on this non-default-branch-only workflow. It does not dispatch work into ChatGPT Work/Codex sessions. Every generated assignment has `dispatchStatus: BLOCKED_NO_VERIFIED_CHAT_TRIGGER`; `summary.actualAgentRunsStarted` is zero. Only actual, supported Work/Codex scheduled/triggered agent runs with an external run ID and a verifiable acknowledgment may advance REQUESTED -> ACKNOWLEDGED -> RUNNING -> COMPLETED. A GitHub comment or action output is *not* that receipt.

For a supported future chat-dispatch adapter, insist on explicit provider/permissions, a real event trigger, idempotent event key per role/task/PR/head, observed run ID, no hidden spend, one CURRENT assignment per executor, error handling, and independent review gates. Never infer this from mere issue metadata.

## Queue behavior

- Read the current development SHA, issues, PR heads and evidence. Route mandatory exact-head reviewer corrections to **SDC 05 with the original source owner explicitly attached**; review candidates to SDC 03 next; verified reviewed/CI candidates to SDC 06 for **additional gates**, then eligible READY work under existing SDC 02/04/01 owners. Development push signals a separate SDC 03 milestone re-audit packet but do not imply a review was performed.
- Preserve CURRENT before taking a correction or new milestone. All instructions are concise and one-shot; no repeated AI status prompts or artificial hourly cycles.
- The snapshot reads GitHub's actual check-runs and native PR review records for the exact head; unreadable evidence fails closed. Only an explicit configured allowlist of independently authenticated GitHub reviewers, different from the PR author, can yield machine-verifiable `ACCEPTED` (native `APPROVED`) or `CHANGES_REQUESTED`; untrusted `COMMENTED` reviews remain advisory. **No independent reviewer credentials are provisioned by this PR.**
- An open task in CURRENT blocks additional READY task routing for that owner. New PEA-2 READY packets with mismatched `Workstream`/`Branch`/`Target`, missing typed START/INTEGRATION dependencies, unresolved hard dependencies, missing exact paths, or open-PR path overlaps fail closed. At most **one NEXT READY packet per existing executor role** is proposed; later eligible issues are explicitly retained in `queuedReady` for a subsequent handoff. This is an advisory snapshot, not atomic distributed path leasing or an active cross-run queue.
- All PRs without trustworthy machine-readable exact-head review verdicts remain review-needed. Old prose Mode B reviews are advisory; do not invent machine verdicts.
- No PR is automatically merged. Production and `main` require separate explicit owner approval.
- The Steward may report cleanup but does not own coding, review or integration.
- One global active V1 milestone #58; runtime acceptance #59 remains open until a real existing-chat task -> PR -> review -> corrections/integration -> next task loop is demonstrated.

## Zero-hosting GitHub Actions setup

Workflow `.github/workflows/sdc-role-orchestrator.yml` uses a standard GitHub-hosted runner, read-only GitHub token permissions (including checks:read), pinned checkout/setup-node, and an artifact. It runs **trusted integrated development source only**, never executes candidate PR-head code. It is intentionally limited to pull-request and development-push events available from the non-default branch. It **does not** trigger directly from issue comments, submitted reviews, or CI completion; that coverage requires separately verified supported mechanisms and cannot be inferred from this workflow. Triggers run an observation and produce assignments; they do NOT directly launch the six chats. Event runs are bounded by workflow concurrency. Assignment keys are deterministic and duplicates are suppressed **only within one snapshot**; this is **not durable cross-run delivery deduplication or an actual queue**. No VPS, panel, paid OpenAI API key, personal ChatGPT auth tokens or services are installed.

Run locally:

```sh
node --test tests/sdc-role-orchestrator.test.mjs
GITHUB_REPOSITORY=codewptech/skyinnk node scripts/sdc-role-orchestrator.mjs --out sdc-routing.json
```

The CLI requires access to the public repository; a limited `GITHUB_TOKEN` is recommended to avoid API rate limits. It reads GitHub only and writes an output report locally.

## Budget-saving policy (not yet machine-enforced)

- Normal: >55% remaining allowance.
- Conservation: 36–55%; one primary coding task in the existing SDC lane.
- Strict conservation: 21–35%; milestone-critical corrections only.
- Protected reserve: <=20%; emergency preservation/security/recovery only.
- Apply separately to five-hour and weekly allowance, take stricter active mode. **Do not invent live usage readings or claim automatic enforcement.** If a reliable allowance signal is unavailable, human-supplied mode or a conservative task cap is required for real unattended dispatch. Deterministic Actions route snapshots consume no model prompts.

## Acceptance / remaining blockers

- Tests and full Development CI must pass at the exact PR head. A previous failing experiment or an older green commit is not acceptance. The owner/implementation author may document a preflight but cannot substitute it for a real independent SDC 03 Work review.
- Independent SDC 03 review and protected development integration required.
- Confirm available chat triggers, independently authenticated reviewer credentials, receipt protocol, cross-run durable state, and permission scopes before claiming automatic role dispatch. Without those, route only blocked snapshot packets, and do not claim that the six chats are awake or advancing.
- Owner deleted all four legacy ChatGPT watchers; do not recreate them as a substitute for event-driven dispatch.
- No blanket deletion of active V1 feature PRs or unique-commit unmerged branch refs.
