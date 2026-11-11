# V1 direct GitHub development workflow

Permanent workflow: **GitHub → Codex/Work → tested commits → development branch → controlled release**. Manual ZIP and patch integration is retired as the normal workflow.

Repository: `codewptech/skyinnk`.
Target: `development/v1-public-launch`.
Feature branch: `work/v1-public-learning-integration`.
Inspected remote head: `3217efa`; Chat 03 API migration: `4fe0d24`.

## Reconciliation completed

The prior V1 batch `41beb76` was reconciled against the real development branch. Its V1 application changes were retained. The remote API implementation, deployment probes, HTTP security tests, Prisma schema/migrations and canonical ADL were preserved. The sole overlapping ADL conflict was resolved in favor of the current remote document. Existing homepage SSR assertions were updated for the new page.

Chat 03 commits remain ancestors of the integration branch. Do not reset, overwrite or force-push the development branch. Fetch before publication; if its head changes, compare the incoming commits and rerun checks after reconciliation.

## Publication and review

Use a feature branch and PR targeting `development/v1-public-launch`. Confirm branch protections and required reviews before merging. No PR or merge should target production-deploying `main` without separate release authorization.

Repository access was restored on 11 November 2026 after `codewptech/skyinnk` was added to the connected GitHub App installation. The verified implementation was published as commit `ff54735745717331c6d8215dc32e60586d7fd2b8`, with tree `2aa4dbd666ce0c4464f9feddd1ec4b6777fd4e1b` exactly matching the tested local integration tree. A fresh fetch confirmed identical source files.

Draft PR: https://github.com/codewptech/skyinnk/pull/1 — base `development/v1-public-launch`, head `work/v1-public-learning-integration`. The PR is not merged. Source publication uses the authorized GitHub connection; a separate Git/gh credential is not necessary for this workflow. No manual ZIP/patch handoff is required.

## Validation and continuing work

Run `npm ci`, `npm run test:all`, `npm run check:all`. The optional production fixture smoke is `node scripts/smoke-v1.mjs --isolated-fixture --http-only --artifacts /absolute/qa-directory`. On a browser-capable environment omit `--http-only`; use `--serve-fixture` for manual test-only preview.

Keep routine tests lightweight. The current production workflow still triggers only for main push/PR; it was not changed during reconciliation. Development-branch CI can be added in a separate scoped change after write access is established.

Continue publication/content review, browser/Auth0/container/recovery checks and the factual release-state record. V2 database/CMS work remains separate. No live Neon connection or migration is necessary for this V1 implementation.
