# Skyinnk — enforced GitHub development workflow

Authority: repository owner approval and CODE RED Issue #2. This is a source-control contract, not a change to approved product architecture.

## Protected branches

| Branch | Purpose | Change protocol |
| --- | --- | --- |
| `main` | Production only | Owner-approved release PR, required `CI`, never routine agent push |
| `development/v1-public-launch` | Non-production integration | Reviewed PR only, required `Development CI` |
| `chat03/task-*` | One backend/technical task | Task issue and reserved files |
| `work/task-*` | One V1 frontend/content task | Task issue and reserved files |
| `chat01/task-*` | One architecture/governance task | Task issue and reserved files |

Every task starts from the **latest remote development HEAD** on a fresh short-lived branch. Do not push directly to the integration branch even if the owner account's emergency bypass could allow it. Do not reuse a prior task branch. Never reset or delete unintegrated work.

## Task ownership — before changing files

Create one GitHub task issue using `.github/ISSUE_TEMPLATE/development-task.md`. Required metadata:

```text
Workstream: Work
Branch: `work/task-example`
### Reserved shared paths
- `package.json`
- `nuxt.config.ts`
```

Only reserve paths genuinely needed. The owner must check Issue #2, open PRs and other active task claims. If another agent already owns a file, coordinate and transfer ownership before editing. One active editor per shared file.

## Workstream responsibilities

- **Chat 01:** Architecture HQ, product decisions, development policy. No routine application-source changes.
- **Chat 03:** Backend, APIs, Auth0 middleware, Prisma, infrastructure/CI, security, integration review. Sole steward for `docs/releases/V1-RELEASE-STATE.md`.
- **Work:** V1 homepage, catalogue, course details, classroom, repository-managed lesson content, Markdown and public resources, frontend tests. Does not modify `server/`, `prisma/`, `app/middleware/`, CI workflows, or release-state ownership files.

Shared hotspots include `package.json`, `package-lock.json`, `nuxt.config.ts`, `app/app.vue`, `README.md`, `docs/releases/*`, workflow files and existing cross-stream tests. They require an exact-file reservation in the task issue. Chat 03 must reserve and coordinate before editing Work-owned UI files.

## PR protocol

1. Read Issue #2, latest remote development SHA, active PR files and active ownership issues.
2. Claim task owner, exact branch and shared-file reservations in an **open** issue.
3. Implement only on that feature branch; run task-specific tests and record truthful results.
4. Open PR targeting `development/v1-public-launch` with a standalone line `Task issue: #NUMBER`; use the PR template to report test evidence, changed paths, blockers and integration risks.
5. The required `Development CI` checks branch namespace, open issue claim, shared-file reservations, cross-stream ownership and filenames overlapping with other open PRs, plus lightweight tests, Prisma/type checks and production build. If there is a conflict, coordinate rather than bypassing validation.
6. Chat 03 reviews cross-layer compatibility and manages **one non-production integration at a time**. Reconcile the feature branch against latest development and rerun checks before merging.
7. After merge, close the task and start new tasks from the latest development HEAD.
8. Release to `main` requires **separate explicit human owner approval**, a verified production release PR, required `CI`, and release/rollback checks. A development merge never authorizes production.

## Emergency operations and limits

Both important branches have active GitHub rulesets: PRs, required branch-specific checks, conversation resolution, current-base validation, deletion/force-push restrictions. The `codewptech` user is the sole **Always allow** emergency bypass. This is a deliberate recovery exception, not authorization for routine agent writes. Keep owner credentials carefully controlled.

GitHub cannot prove which ChatGPT agent made a commit if agents share the same account. It cannot stop two agents editing local files before pushing. Task claims, automated PR checks and Chat 03 integration review mitigate this risk but do not replace isolated credentials or owner judgment. Code running in a PR can potentially change its own workflow, so sensitive workflow/policy modifications require deliberate review and ownership.

## Pre-protocol V1 work

Draft PR #1 (`work/v1-public-learning-integration`) predates this contract. It is temporarily exempt from **new task-branch metadata only**; normal CI and technical review still apply. Retire this exception after PR #1 has been safely merged/closed. Do not discard its tested work.

Browser/mobile behavior, real Auth0 flows, educator-approved content, final legal text, live operational validation and production approval remain distinct V1 launch gates. This policy does not alter them.

## Governance changes

Changes to this file, `AGENTS.md`, the PR template, the policy script or CI workflow require their own reserved governance task and PR with regression tests. Issue #2 is the shared coordination record and is mandatory reading for every workstream.
