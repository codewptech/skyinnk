# Skyinnk — mandatory repository instructions for all AI coding agents

This repository has **two protected long-lived branches**: `main` (production) and `development/v1-public-launch` (non-production integration). **Never directly push to either.** Never push to, merge, or deploy `main` without explicit approval from the human repository owner. Do not modify live Neon, production VPS, production secrets or deployed infrastructure without separate explicit approval.

**Before any GitHub write:**
1. Read [CODE RED coordination Issue #2](https://github.com/codewptech/skyinnk/issues/2), [the workflow contract](docs/governance/DEVELOPMENT-WORKFLOW.md), current open PRs, and the latest remote development SHA.
2. Open/claim one GitHub task issue. Record `Workstream`, exact `Branch`, affected paths and exact `Reserved shared paths`. Ensure no other active task owns those files.
3. Create a fresh short-lived branch **from latest remote development**: `chat03/task-*` for technical work; `work/task-*` for V1 frontend/educational content; `chat01/task-*` only for architecture/governance.
4. Make and test changes only on that feature branch. Open a PR targeting `development/v1-public-launch`, with `Task issue: #NUMBER` on a separate line. Do not bypass/disable tests.
5. The required `Development CI` job checks tests/build, branch namespace, task claim, shared-file reservation, ownership boundaries and file overlap with other open PRs. Never attempt to avoid the checks by changing workflow/policy code without a reserved, reviewed governance task.
6. Cross-layer changes require advance coordination with Chat 03. Work must not modify backend, Prisma, Auth0 middleware, CI or `docs/releases/V1-RELEASE-STATE.md`. Chat 03 owns that canonical release-state file.
7. Chat 03 is technical integration steward: review cross-stream changes and verify exact head/test evidence before non-production integration. Do not merge another agent's active PR without coordination.
8. Preserve already-tested work and commit history; do not force push, reset, delete active branches or silently discard other work.

**Workspace ownership:** Chat 01 = product architecture and governance only (not routine feature implementation); Chat 03 = backend/APIs/Auth0/Prisma/infra/CI/security/integration; Work = V1 public UI/classroom/catalogue/educational lesson integration and UI verification.

**Emergency bypass:** `codewptech` has an *Always allow* branch-ruleset exception, for owner-authorized emergency recovery only. An available bypass is **not** permission for agents to use it for routine commits or merges. The account owner retains release authority.

**Grandfathered work:** Existing draft PR #1 uses pre-policy branch `work/v1-public-learning-integration` and is exempted from new task-branch metadata **only until merged or closed**; it still requires passing tests/build and Chat 03 review. New PRs must use the prescribed task branches.

For details, read `docs/governance/DEVELOPMENT-WORKFLOW.md`. This file does not supersede the approved Skyinnk Architecture Decision Log or the V1/V2 scope.
