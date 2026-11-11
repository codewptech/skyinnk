# Skyinnk V1 — Actual release state

Date: 11 November 2026. Repository: `codewptech/skyinnk`.
Status: **implemented, tested and published to a non-production GitHub feature branch; draft PR open; not launch-ready; not deployed**.
Shared integration branch: `development/v1-public-launch`.
Work feature branch / PR head: `work/v1-public-learning-integration` (PR #1, not merged).
Implementation commit: `ff54735745717331c6d8215dc32e60586d7fd2b8`; published tree matches the tested local tree exactly.
Draft PR: https://github.com/codewptech/skyinnk/pull/1 (target `development/v1-public-launch`, not merged).
Target: `development/v1-public-launch`.
Current inspected shared integration head: `ff63b22bde5d0bd1f856ec8d42ed6006cb1faccd` (11 November 2026).
Historical starting point / original merge-base: `3217efa91254d1e8fc06c7138f22c7b3cf9122f7`.
Chat 03 API migration commit `4fe0d24`, architecture commit `3217efa` and release-baseline commit `ff63b22` remain in ancestry after reconciliation. API handlers, callers/probes, HTTP security tests and canonical ADL were preserved from that remote branch.
Prior V1 batch `41beb76` was originally reconciled from `3217efa`; that earlier ADL reconciliation retained the remote canonical document. This round resolves only the release-state add/add divergence against `ff63b22`; application source is unchanged. Current merge revision is recorded by feature-branch history.
Production commit/date/routes: **not inspected or changed by this task**.

## Shared baseline and workstream evidence

Chat 03 added the release-state path independently in `ff63b22`, after Work branched from `3217efa`. This produced an add/add documentation conflict only; no API, Prisma or application files changed on the base side. Reconciliation merges the current integration head into Work's feature branch and preserves both histories.

| Evidence scope | Actual state |
|---|---|
| Shared integration at `ff63b22` | Coming Soon homepage; public catalogue/course/classroom implementation pending in that branch until PR #1 is merged |
| Work feature branch / PR #1 | Public frontend, content contract and classroom implemented/tested, still unmerged and not deployed |
| Chat 03 baseline verification | Developer reported 20/20 tests; Prisma 6.19.3 validation/generation, typecheck, production build and 237-artifact secret-marker check after Task 01. Historical local evidence, not proof of the new classroom or browser journey |
| Work implementation verification | 30 lightweight tests, production build and 354-artifact secret-marker scan; isolated public-content/HTTP checks. Re-run after this reconciliation is recorded below |

The shared baseline retains Auth0, the original User and original migration; Schema V4's 66-model candidate remains V2-only and is not installed or migrated. Public guest learning must remain sign-in-free. No production revision or deployment has been authorized or verified.

## Implemented routes and evidence (Work feature branch)

| Route | Local behavior | Verification |
|---|---|---|
| `/` | Responsive public homepage, honest subject preparation labels, optional existing Auth0 controls | Actual Vue SSR guest/signed-in tests; production HTTP |
| `/courses` | Published course catalogue; truthful empty state today | Production HTTP, integrated type/build checks |
| `/courses/[courseSlug]` | Released course details and ordered syllabus; unknown courses 404 | Isolated production fixture, exact expected course heading |
| `/courses/[courseSlug]/lessons/[lessonSlug]` | Route-based classroom, video/text mode, responsive syllabus, tabs, notes, resources and cross-module navigation | Type/SFC/build tests, isolated production fixture exact video/text lesson headings; interactive behavior still requires browser execution |
| `/sitemap.xml` | Canonical URLs from only the public manifest | Fixture lesson URLs verified in XML |
| `/api/v1/health` | Liveness independent of database | Unit/HTTP and production fixture; legacy paths 404 |
| `/api/v1/ready` | Existing readiness contract preserved | Mocked persistence success/failure tests; no live Neon check |
| `/api/v1/auth/sync` | Existing POST-only session/CSRF/rate-limit protections preserved | Unit/HTTP boundary tests; real Auth0 login/logout not run |

The course-detail file moved to `[courseSlug]/index.vue` so lesson URLs render the lesson page instead of an unrendered nested child. Classroom state reads changing route parameters; no persistent progress or enrollment is implied.

## Released educational content

**Zero real courses / zero real lessons released.** `content/catalogue.json` is `{schemaVersion:1,courses:[]}`. No teacher-approved content was supplied. Synthetic interface fixtures exist only in tests or temporary isolated builds; they are never public course data.

Build validation requires stable source keys, explicitly public/published review metadata, unambiguous routes, valid optional YouTube IDs and truthful resources. It checks resource existence, file size, real-path containment and an allowlist; unlisted resource files fail the build. Matching reviewed resources may be reused across lessons.

Markdown uses HTML-disabled markdown-it and bounded, untrusted KaTeX rendering. Links and images have explicit policies; notes cannot load remote tracking images. Public video makes no iframe request before the student's Load video action; playback is not set to autoplay. Actual media availability and rights remain unverified until real media is supplied.

## Database, security and compatibility

- Prisma 6.19.3: original `User` only. Original `20261104000000_create_auth0_user` migration unchanged.
- No educational schema, Schema V4 installation, migration execution or live database connection.
- Auth0 SDK `/auth/*` routes remain unchanged; User sync remains homepage-scoped as in the baseline.
- Existing private/no-store origin and CDN cache policy retained. GTM remains disabled by default; production runtime consent/configuration must be checked before release.
- Docker build context now includes only the new approved catalogue and necessary validation/shared code. A real container build has not been executed in this task.
- Authoritative ADL v3.1 is unchanged from the actual remote development branch.

## Verification

Runtime: Node 24.22.1 / npm 11.9.0. Fresh `npm ci` succeeded on the reconciled development baseline. Reconciliation validation reran successfully: 30 tests, check:all with 354-artifact secret scan, and isolated production course/video/text/resource/sitemap/404 checks.

- `npm run test:all`: **30 tests passed**. Includes Auth0 normalization/coordinator behavior, HTTP security/rate-limits/cache/session expiry, API versioning, actual Vue SSR, Markdown/KaTeX attacks and content/publication/resource validation.
- `npm run check:all`: **passed**. Prisma validate + client generate, Nuxt typecheck and production build. **354 production artifacts excluded build-secret markers**. Database URLs and Auth0 settings were intentionally unusable local validation values.
- Isolated fixture production build + **14 HTTP requests passed**, including exact course/video/text page headings, real TXT resource, sitemap lesson URLs, no-store behavior, legacy API/unpublished 404s and POST-only sync.
- Current production preview: six grouped HTTP checks passed against the empty real manifest. Development server startup was attempted; Nitro could not open its worker socket (`listen EPERM ... nitro-worker...sock`), so development-mode HTTP checks are blocked by the environment. Earlier logs remain development evidence; no new ZIP handoff is used.
- Chromium launch was attempted twice and failed on a restricted socket operation before page load. Shared Chrome could not reach the execution preview (connection refused). **Mobile layout, keyboard/dialog interaction, video persistence and client history are implemented but not browser-verified.** The opt-in runner is provided for a working browser environment.
- No production claims follow from synthetic content, mocks or local HTTP checks.

## Reconciliation verification — 11 November 2026

Resolved the add/add release-state conflict while merging integration commit `ff63b22` into Work's PR branch. Both histories are retained. The resolution changes only the three Work release/coordination documents; application/API/Prisma/test/workflow files match the previously published Work head. Chat 03's API, ADL and baseline release-state commits remain in ancestry.

Fresh checks on the resolved worktree: `npm ci` passed (592 packages); `npm run test:all` passed 30/30; `npm run check:all` passed Prisma 6.19.3 validation/generation, Nuxt typecheck and production build, with 354 artifacts excluding secret markers. The isolated fixture production build and public-content HTTP smoke passed again (result timestamp `2026-11-11T15:47:36.927Z`), covering exact course/video/text headings, physical resource, sitemap, legacy/unpublished 404s and cache behavior. Browser checks were explicitly not run in HTTP-only mode; previously recorded environment blockers remain unresolved. This is local execution evidence, not automatic development-branch CI or production evidence.

PR #1 remains draft and unmerged for Chat 03 technical review. The shared integration branch was not written by this reconciliation; only Work's feature branch receives the merge resolution.

## Coordination responsibilities

- Chat 01 owns architecture, product scope and material approvals.
- Chat 03 is technical lead for backend/API development, integration compatibility and technical review.
- Work owns V1 frontend, classroom, course content integration and public-launch implementation.
- Inspect the latest integration branch and open PRs before editing. Each implementation task uses a dedicated feature branch and PR. Coordinate before changing another active workstream's files.
- The shared integration branch is not a destination for competing direct commits. Chat 03's review of PR #1 is recorded at https://github.com/codewptech/skyinnk/pull/1#issuecomment-6800303635; Work owns this conflict resolution.
- The production workflow covers main push/PR only. Local evidence must not be described as automatic development-branch CI.

## Launch gates and operations

Reviewed lessons/media/resources, accurate approved Privacy/Terms, real Auth0 smoke, browser/mobile tests, container build, backup/rollback readiness and explicit owner release approval are still required. Existing policy text remains an unapproved template; only its skip-link target changed.

Permanent workflow: GitHub → Codex/Work → tested commits → development branch → controlled release. GitHub repository authorization is restored, source publication succeeded and draft PR #1 is open. A fresh fetch verified the exact tested source tree. Remaining standalone Git/gh or Codex Cloud login limitations do not block the working GitHub publication path. No main push/merge, deployment, live Neon change or production infrastructure operation occurred.

## V2 bridge

Public source keys and canonical slugs map to future approved entities; actual new database IDs must be PostgreSQL-generated UUIDv7. Enrollment, saved completion/progress, dashboard, CMS, protected delivery, private doubts, Solved Questions, Cashfree, invoices, notifications and editorial remain V2 work. Signing in has not been treated as enrollment. Chat 03's separate V2 work must be reconciled by diff before integration.
