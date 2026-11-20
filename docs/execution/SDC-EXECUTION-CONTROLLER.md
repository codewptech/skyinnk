# Skyinnk V1 — Local SDC Execution Controller

**Status: source implementation candidate, not an installed autonomous agent.** The real execution acceptance contract is GitHub Issue #59. Controller task: Issue #60. Read AGENTS.md, docs/governance/DEVELOPMENT-WORKFLOW.md and Issue #2 before use.

## Operating model

This is a continuously running, **single-host, serial** Codex source worker on the machine where it is launched. It selects eligible PEA-2 task issues from ONE global V1 milestone roadmap, checks exact file claims and open PRs, invokes Codex CLI in an isolated Git worktree, runs required local checks and submits one task PR for independent SDC 03 Work review.

It does not replace the reviewer or integrator; it does not merge, deploy or touch the protected development/main branches directly. It is not a distributed task broker, paid API runner, privileged App or proof that dormant ChatGPT conversations can wake from GitHub issues.

## Operator prerequisites

- A trusted computer or server that stays on while the local worker executes, running Node.js 24, Git and npm.
- A clean clone of codewptech/skyinnk with origin pointing at that exact GitHub repository.
- GitHub CLI (gh) authenticated with least-privilege issue/branch/PR permissions and without emergency bypass use. Do not give automated workers owner recovery credentials.
- Codex CLI installed and authenticated through a supported Codex/ChatGPT login. Confirm a disposable codex exec test works. A new OpenAI API key is not required by the design itself; actual authentication/plan limits must be verified on the execution machine.
- The existing PEA-2 source policy and task issue format remain in force.
- Run one controller instance on one host only. The local lock does not protect against a second host.

## Commands

From the repo root, inspect eligible tasks without touching GitHub:

    node scripts/sdc-execution-controller.mjs --role chat03 --once --dry-run

After checking credentials and source claims, execute ONE bounded eligible task:

    node scripts/sdc-execution-controller.mjs --role chat03 --once

Continue task pickup whenever work is ready, without hourly/daily waits:

    node scripts/sdc-execution-controller.mjs --role chat03 --loop --poll-ms 15000 --max-tasks 20

The --max-tasks limit intentionally bounds a run. An owner-configured local process supervisor may restart successful runs. An error or blocked worktree must first be inspected; never blindly overwrite an unfinished task. Optional --role work uses Codex in the PEA-2 Work source lane; it does NOT activate the actual SDC 02 ChatGPT Work conversation.

## Execution steps

1. Read GitHub issues, open PR filenames and development SHA. Do not work from stale chat memory.
2. Verify real PEA-2 issue metadata, permitted exact paths, START dependencies and absence of conflicting claims/open PRs.
3. Finish the current active task first; for READY queue selection, mandatory Reviewer corrections have priority over new global V1 milestone assignments.
4. Recheck development revision and issue body before claiming. Record the actual local process ID as executor; claims are advisory, not distributed atomic locks.
5. Require each dispatchable task to contain the exact line Global V1 milestone: #58 (or the actual current canonical milestone issue number), and verify that the referenced open GitHub issue is a global V1 milestone. This prevents arbitrary unrelated PEA-2 work from being selected.
6. Create a new task branch/worktree from the current development SHA. Install dependencies only there. Invoke the authenticated Codex CLI using a workspace-write sandbox and narrow task prompt.
7. Check every changed path against exact claimed filenames, including both sides of renames. Run npm run test:all and npm run check:all.
8. Commit and push only the task feature branch and create a PR targeting development/v1-public-launch. Hosted Development CI and independent SDC 03 review are required before integration.
9. Immediately return to the queue while the local process remains running. Idle polling is a recovery mechanism, not a development clock.

## Review and integration handoff

- SDC 03 Work can subscribe to supported GitHub PR activity in its OWN Work conversation. This must be configured and demonstrated separately.
- SDC 06 integrates only reviewed, passing, owner-authorized nonproduction changes. The local controller does not automatically merge.
- After verified development integration, SDC 03 Mode D re-audits the updated global V1 milestone and replenishes the single roadmap.
- Owner laptop review is optional; production release and live changes remain owner-gated.

## Security and runtime limits

The worker removes GH_TOKEN, GITHUB_TOKEN, OPENAI_API_KEY and other key environment variables from the Codex subprocess and sets a fresh GH_CONFIG_DIR. This is defense-in-depth, **not a proven credential isolation boundary**: existing Git credential helpers or home configuration may still expose privileges. Use a dedicated least-privilege OS identity and credential scope for genuinely unattended deployment.

There is no atomic cross-host issue claim. The local lock serializes only processes on the same machine. Do not run copies on multiple computers. Missing PR lists, ambiguous claims, unknown issue packets, stale bases, safety gates and failed tests must block processing, never be silently bypassed.

Existing PRs marked CHANGES_REQUESTED remain with their original executor; the controller currently selects new READY tasks only. Tasks lacking a live canonical Global V1 milestone issue reference are intentionally ineligible. Review corrections can be queued as separate correctly owned READY tasks with a line reading SDC Queue: Reviewer correction. Never interfere with an active current owner.

The controller pages GitHub issue, pull-request, and changed-file listings up to 10 pages of 100 items each and fails closed if that safety limit is exhausted. Extend only with reviewed pagination tests.

## What is NOT yet complete

This GitHub PR is a source candidate, not an installed daemon. A real local environment must supply Codex CLI, gh authentication and ongoing machine availability. Issue #59 still needs observed evidence of an unattended coding execution, resulting CI-backed PR, automatic second eligible task selection, independent event-triggered Reviewer activity, authorized nonproduction integration and updated-milestone re-audit.

A hosted alternative would need separate owner approval for credentials, paid API use, runner uptime and permission scope. None is created or activated here.
