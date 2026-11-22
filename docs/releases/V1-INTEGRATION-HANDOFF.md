# V1 direct GitHub development workflow

## Current status — 21 November 2026

The application/test source last validated before this documentation-only checkpoint is `3714ae1e8eeb9cde2d38f8a51c3763c49527861e` (postmerge Development CI and real disposable PostgreSQL acceptance passed). The completed source/governance integrations are #14/#55/#18/#20/#56/#16/#30/#28/#65/#67. Actual empty/fictional Chromium+Nitro, SHA-256 resource delivery, disposable PG18 subject concurrency, and isolated Docker restore/recovery have all run and passed; see [canonical release state](V1-RELEASE-STATE.md) for exact evidence.

**Not production-ready:** there are zero educator-approved published courses, and actual tenant/Auth0, real media, legal/consent, accessibility on genuine devices and owner release/production rollback sign-off are outstanding on [global V1 #58](https://github.com/codewptech/skyinnk/issues/58). The historical PR #1 draft instructions and obsolete branches/SHAs below are retained for audit, not current execution directions. No controller activation occurred.
---

This is the historical pre-merge integration handoff. For verified merged routes, current test evidence and release gates, see the [canonical release state](V1-RELEASE-STATE.md).

Permanent workflow: **GitHub → Codex/Work → tested commits → development branch → controlled release**. Manual ZIP and patch integration is retired as the normal workflow.

Repository: `codewptech/skyinnk`.
Target: `development/v1-public-launch`.
Feature branch: `work/v1-public-learning-integration`.
Current inspected integration head: `ff63b22`; historical starting point: `3217efa`; Chat 03 API migration: `4fe0d24`.

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

## Shared workstream coordination

Chat 01 owns architecture/product/scope/approvals. Chat 03 leads backend/API development, compatibility and technical review. Work owns V1 frontend/classroom/content/public-launch implementation. The shared integration branch is not for competing direct commits; inspect it and open PRs before each task, use dedicated feature branches, and coordinate before changing another active workstream's files.

PR #1 reconciliation merges Chat 03's `ff63b22` release-baseline record into Work's branch. Preserve Chat 03's baseline evidence separately from Work's implemented-but-unmerged route/test inventory. Chat 03 provides technical review; Work resolves its own PR.
