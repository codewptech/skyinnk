# Skyinnk SDC V1 — GitHub-hosted agentic engineering cycle

**Status 22 Nov 2026: SOURCE IN REVIEW, NOT ACTIVE.** Canonical owner request: run recurring engineering inside the PUBLIC GitHub repository even when owner laptop is off. Canonical PEA-2 task [#78](https://github.com/codewptech/skyinnk/issues/78); runtime acceptance [#59](https://github.com/codewptech/skyinnk/issues/59). Read-only router PR #63 is separate; do not conflate routes with real agent execution.

## Mechanism
Use official [GitHub Agentic Workflows (gh-aw)](https://github.github.com/gh-aw/) compiled to GitHub Actions, with engine Copilot. Source: `.github/workflows/skyinnk-sdc-cycle.md`. Executable lock: `.github/workflows/skyinnk-sdc-cycle.lock.yml` **must be compiler-generated** and committed; never fabricate a lock YAML. CI helper `.github/workflows/skyinnk-gh-aw-compile.yml` verifies source and stores compiler output on a development-targeted PR without invoking a language model.

Event signals: completed Development PR CI, 4-hour scheduled safety pickup, or manual workflow_dispatch. Every run is finite and bounded, not a continuously running machine. A run is useful only if an actual eligible PEA-2 task is READY. On no eligible task, worker must exit without a PR; priority CURRENT > reviewer corrections > global V1-58 engineering work. No direct merge, no privileged reviewer, no SDC 03 impersonation, no live deployment.

## Inference permissions and cost
This PERSONAL public repository cannot infer remotely using a ChatGPT Plus session token. The Copilot model needs an actual GitHub Copilot entitlement with AI-credit budget; owner must add a fine-grained GitHub PAT with **Copilot Requests: Read** as repository Actions secret `COPILOT_GITHUB_TOKEN`. Do not paste token in issue, PR, chat, source, log or public files. Alternative provider API keys require separate provider billing permission and a new security review; **no default assumption of paid API approval**.

One agent per run; 80 main AI credits per run, 240 main credits per 24h window, 60 threat-detection credits per run, up to 18 turns / 15 min; these are caps and *not* a free quota or cost guarantee. Actual billing in GitHub Copilot and Actions is separate. Confirm owner budget and GitHub account entitlement before activation; start with one manual test.

## Why this is NOT live simply by merging into development
GitHub Actions `schedule` and `workflow_dispatch` workflows are recognized from the repository's DEFAULT branch. Here the default branch is protected production `main`. **Even if the gh-aw source and lock are normally reviewed/merged into non-production development, the unattended recurring schedule does not become active until a separately owner-approved main workflow installation.** This must not be performed via owner-account branch bypass or automated merge. Do not deploy unrelated unfinished V1 production code to main just to install the automation; propose a narrowly controlled release workflow-only change with accurate diff/CI and owner approval.

## CI and source integration sequence
1. New #78 task on fresh `chat03/task-gh-aw-sdc-cycle`; source and compiler workflow in original branch. No modifications to PR #63's four current claimed files.
2. New PR into `development/v1-public-launch`; required Development CI + source compile check run. Download `skyinnk-sdc-gh-aw-compiled-lock` artifact. **Commit the exact gh-aw-generated lock to the same feature branch**, then rerun both checks. If compile/check fails, DO NOT merge.
3. Real SDC 03 independent technical/security review and permitted SDC 06 serialized nonproduction integration; exact development SHA/postmerge CI.
4. Owner checks Copilot allowance and private `COPILOT_GITHUB_TOKEN` secret and authorizes capped usage and narrowly scoped default-main workflow activation.
5. Activate Github workflow on default branch without changing application runtime or releasing V1. Verify actual GitHub Actions run and Copilot model inference, real logs/credits, bounded task-generated DRAFT PR and PEA-2 claim/path validation. If no READY tasks exist, create eligible tasks through normal SDC planning **before** interpreting an idle run as failure.
6. Independent review (must be real, not author account self-review); authorized development PR integration and exact postmerge CI. Verify a *second* automatically triggered run with a distinct run ID and legitimate next eligible work. Only then close Issue #59 as operational.

## Important conflict with unlimited 24/7 goal
GitHub Actions workflows are finite jobs, event-based and/or scheduled. This policy implements near-continuous progression **when eligible tasks and model credits exist**, not literally an infinite paid process. No system has permission to consume an unlimited model budget or disable branch protections. Human review may temporarily block integration, but engineering can continue on non-overlapping READY tasks.

## Authoritative references
- [GitHub official creating agentic workflows](https://docs.github.com/en/copilot/how-tos/github-agentic-workflows/creating-github-agentic-workflows)
- [gh-aw compiler and lock structure](https://github.github.com/gh-aw/reference/workflow-structure/)
- [gh-aw personal repo Copilot auth](https://github.github.com/gh-aw/reference/auth/)
- [gh-aw run and daily AIC caps](https://github.github.com/gh-aw/reference/cost-management/)
- [gh-aw safe outputs PR protection](https://github.github.com/gh-aw/reference/safe-outputs-pull-requests/)
- [GitHub Actions schedule uses default branch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
