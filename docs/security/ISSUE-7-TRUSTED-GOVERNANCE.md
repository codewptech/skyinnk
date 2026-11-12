# Skyinnk Issue #7 — Trusted governance checker (non-production implementation)

**Task:** https://github.com/codewptech/skyinnk/issues/7  
**Owner/workstream:** Chat 03 security and integration  
**Starting development commit:** `8ec0a4da982707e0b9c8a6c04e4cda49ccd1f79b`  
**Feature branch:** `chat03/task-7-trusted-governance`  
**Status:** Code/test implementation pending review; **NOT LIVE OR ENFORCED** until an owner-provisioned, separately hosted App and ruleset activation are verified.

## Chosen implementation: independently deployed GitHub App

The original `Development CI` governance script is inside the PR merge checkout. It is useful for detecting mistakes, but an author can change that script/workflow within their proposed changes. Do not treat its status as trusted evidence against malicious PRs.

The new self-contained checker lives in `security/trusted-governance/`:

- `policy.mjs`: trusted policy over GitHub API metadata only, with exact frozen PR #1 legacy path allowlist. Validates branch namespace, open task issue, workstream and branch claim, mandatory exact shared-file reservations, workstream-specific protections, governance files and overlaps with all other open development PRs.
- `github-app.mjs`: signs short-lived GitHub App JWTs; requests narrowly scoped installation tokens; retrieves fresh GitHub PR/issue/file-name metadata; publishes `Skyinnk Trusted Governance` **check runs** on exact PR HEAD SHAs using the App identity.
- `server.mjs`: standalone webhook HTTP server with raw-body HMAC-SHA256 verification, repository and installation matching, limited request sizes, queued serial reconciliation, initial scan, five-minute periodic rescan (including base changes) and fast webhook acknowledgment.
- `Dockerfile`: dependency-free Node 24 container entrypoint. Build with `docker build -f security/trusted-governance/Dockerfile security/trusted-governance` (narrow build context; does not include any application or `.env` files). **No deployment performed.**
- `tests/trusted-governance.test.mjs`: positive/negative policy, HMAC, JWT, mocked check-run API and event-path tests.

The App service must run from a **pinned, reviewed image/commit in a non-production environment controlled by the owner**. Do not run from an arbitrary feature-branch checkout or automatically update its running code on PR push. It never checks out PR source or loads `scripts/verify-pr-governance.mjs` from a PR. It reads PR descriptions, issue data and changed **file names** only; it does not execute any GitHub-provided text as code.

### Trusted App permissions (minimum)

GitHub App repository permissions: `Metadata: read` (automatic), `Pull requests: read`, `Issues: read`, `Checks: read and write`. Subscribe to `Pull request` and `Issues` webhooks only. GitHub requires `Contents: read` for `Push` subscription; we deliberately omit it and rely on the five-minute rescan for base pushes. Install only in `codewptech/skyinnk`. No Contents write, Administration, Actions write, Deployments, Secrets or repository ruleset permissions.

App environment variables in the **deployment provider's secret manager**, not in GitHub files, PRs or chat:

```text
GITHUB_APP_ID=<App's numeric ID>
GITHUB_APP_INSTALLATION_ID=<installation ID for codewptech/skyinnk>
GITHUB_APP_PRIVATE_KEY=<multi-line PEM private key>
GITHUB_WEBHOOK_SECRET=<long random webhook secret>
GITHUB_REPOSITORY=codewptech/skyinnk
PORT=8080
```

Configure TLS with a trusted reverse proxy or managed HTTPS endpoint. Webhook URL: `https://YOUR-APP-HOST/github/webhook`, Content type JSON. `/healthz` is a non-secret liveness endpoint. In production, restrict outbound HTTPS to GitHub API, restrict inbound webhook to HTTPS and preferably verified GitHub source ranges. Run one instance, protect logs, restart on failure, set health/queue alerts, and audit delivery failures. Use a deployment identity with **no connection to the production VPS**.

Test locally with no secrets and no GitHub calls:

```sh
node --test tests/trusted-governance.test.mjs
```

### Activation sequence requiring explicit owner action

1. Review and merge the feature PR to **development only**, after passing `Development CI`. This **does not activate** trusted enforcement.
2. Provision a separately owned GitHub App and a secure, independently hosted instance. Keep its private key and webhook secret in a secret store, not the repository. Deploy the reviewed code from the approved commit/image and test signed webhook deliveries (no PR source execution).
3. Confirm a real legitimate development PR shows `Skyinnk Trusted Governance` from the **new App**, with a successful check run on the latest PR HEAD. Confirm a test PR missing an issue claim returns failure; validate protected file, overlap and tampered PR-controlled policy attempts through temporary feature-branch PRs with no bypass. Do **not** merge those negative test PRs.
4. **Only after verified App check runs**: go to `https://github.com/codewptech/skyinnk/settings/rules`, edit `Protect development - V1 Integration` and add an additional required check named **exactly** `Skyinnk Trusted Governance`, with **Source = the new dedicated App**. Keep the existing required `Development CI`; keep strict up-to-date policy, PR required, deletion/non-fast-forward blocks. This is an owner-only settings change.
5. Use a separate *non-bypass* agent identity to confirm GitHub refuses to merge an invalid PR; use a valid PR to confirm the check is required, passes, and permits the ordinary reviewed process. Verify the new check's App source ID in the **live ruleset API**. Never test by exercising the `codewptech` emergency bypass.
6. Observe webhook delivery and check-run audits for reliable reruns on issue edits, PR edits/synchronizes, competing PR opens/closes; periodic scans cover development base pushes without a Push webhook. Keep the task open until external hosting, enforcement, identity segregation, and negative live outcomes are verified.

**GitHub ruleset snapshots prior to activation:** `Protect development - V1 Integration` ID `27049500` and `Protect main - Production` ID `27046619`, both active. Development requires `Development CI` from GitHub Actions app integration ID `15368`; no trusted-App check yet. Both currently include `codewptech` user ID `118954375` with `bypass_mode=always`. These live settings are **not modified by this task**.

### Four mandatory rejection scenarios

| Attempt | Trusted check outcome |
| --- | --- |
| Open PR without `Task issue: #N`, or issue closed/mismatched | `failure` |
| Work changes `server/`, Auth0 middleware, release-state, governance, or trusted checker paths | `failure` |
| Two open development PRs edit the same path | `failure` on each after reconciliation |
| PR edits `scripts/verify-pr-governance.mjs` or even PR-controlled workflow code to return success | Service still evaluates its own trusted policy; unauthorized change is rejected where role-disallowed; PR-supplied script is never executed. |

A legitimate Chat 03 task with correctly claimed files is accepted. Draft legacy PR #1 retains **only** its exact historical metadata/path exemption. It cannot add new filenames, bypass ownership or overlap checks, nor target `main`.

### Limits and additional hardening

- Current policy validates **declared task and branch claims**, not the human behind the submitter. Genuine identity isolation is essential and requires the owner's account changes in `ISSUE-7-OWNER-IDENTITIES.md`.
- This service has separate `checks:write`, so **do not grant that permission to Chat 03 or Work coder Apps**. GitHub ruleset must pin expected check source to this App; a similarly named check from another actor is not sufficient.
- GitHub required checks attach to a commit SHA; strict up-to-date rules protect base changes. Webhook and five-minute scans reduce stale-issue/overlap windows, but delayed/lost webhooks and service outages require operational monitoring. A previously successful check on an unchanged SHA can remain green until a subsequent scan updates it. Use a durable queue/HA design before claiming continuous high-assurance enforcement.
- GitHub may display test-merge commit checks versus head checks. Inspect the actual required-check box during live tests and ensure the dedicated App check is recognized on the required SHA. Do not enable a check with no valid source/recent run.
- Treat the running service's code/image and admin credentials as **owner-controlled security infrastructure**, not auto-updated through a feature PR. Any change to its deployed code requires separate authorized release and tests.
- No changes to default branch `main` are proposed or necessary for this App-based option. A default-branch `pull_request_target` workflow was **not created**: GitHub sources it from `main`, and a push to `main` triggers the existing production deployment workflow. A future workflow on `main` would require separate explicit owner approval and production impact review.

## Current completion gates (do not mark complete until all verified)

- [ ] Feature PR passes actual GitHub Development CI, reviews, and merges to development.
- [ ] Approved App identity provisioned with restricted permissions and hosted safely.
- [ ] GitHub App check delivered to PR HEAD by the App identity, tested live.
- [ ] Required development ruleset pins expected App source, verified via GitHub API.
- [ ] Live negative PR attempts rejected without bypass; valid PR passes.
- [ ] Distinct non-bypass Chat 03 and Work credentials active; owner emergency account disconnected from routine AI work.
- [ ] No `main`/production/Neon changes and task evidence documented in Issue #7.
