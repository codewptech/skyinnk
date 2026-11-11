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

The GitHub connector currently denies ref creation with HTTP 403 (`Resource not accessible by integration`). Git/gh has no authenticated GitHub host or credential helper; the fallback Codex Cloud task-list call returns HTTP 401 (`Could not parse your authentication token`). Repository user/admin metadata is not proof that this execution environment has a write credential.

Exact repository-scope finding: the connected GitHub App installation `180853687` uses selected repositories, and its accessible repository list does **not** include `codewptech/skyinnk`. This explains why public reads do not establish write authorization. Minimum unblock: add `codewptech/skyinnk` in https://github.com/settings/installations/180853687 and save, then retry connector publication. No Git token or manual file transfer is required when that connection is correctly authorized. A separate Git/gh login or Codex reconnect is only an alternative execution path. GitHub ref/contents publication requires Contents write; PR creation additionally requires Pull requests write. Enter credentials only through the secure account/environment sign-in flow. Do not put tokens in chat, source or git remotes.

## Validation and continuing work

Run `npm ci`, `npm run test:all`, `npm run check:all`. The optional production fixture smoke is `node scripts/smoke-v1.mjs --isolated-fixture --http-only --artifacts /absolute/qa-directory`. On a browser-capable environment omit `--http-only`; use `--serve-fixture` for manual test-only preview.

Keep routine tests lightweight. The current production workflow still triggers only for main push/PR; it was not changed during reconciliation. Development-branch CI can be added in a separate scoped change after write access is established.

Continue publication/content review, browser/Auth0/container/recovery checks and the factual release-state record. V2 database/CMS work remains separate. No live Neon connection or migration is necessary for this V1 implementation.
