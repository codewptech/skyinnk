# Skyinnk V1 — Canonical release state

**Last verified:** 12 November 2026 (GitHub repository evidence)  
**Scope:** ADR-069/070, seven-day-target **public/free-learning V1**, not the full V2 learning-commerce platform  
**Repository:** `codewptech/skyinnk`  
**Shared integration branch:** `development/v1-public-launch`  
**Verified integration HEAD at this review:** `c381cb62a848ff2689aaf0a92df979d840e8af31`  
**Production `main` HEAD independently observed:** `6bfc342e89a19b76570565854b643387d0139e90`  
**Production release/deployment of this V1:** **NOT AUTHORIZED, NOT PERFORMED OR VERIFIED**

> **Status:** V1 public frontend and lesson-content foundation are **merged and CI-verified in non-production development**. This is not a public release: approved educational lessons/resources, real-browser and tenant tests, legal/media sign-offs and release verification are pending. A passing development CI run never authorizes a push to `main`, database migration or production deployment.

## Verified GitHub integration history

| Workstream / change | Commit / PR | Status and evidence |
| --- | --- | --- |
| Existing application foundation | Original Nuxt 4 / Auth0 / Prisma User migration | Preserved; no new academic model or live database migration |
| Chat 03 versioned APIs | `4fe0d24` | `/api/v1/health`, `/api/v1/ready`, `/api/v1/auth/sync`; historical local 20/20 Node tests, Prisma/build verification |
| Approved release architecture | `3217efa` | ADL V3.1, ADR-069/070: public V1 and complete-feature V2 split |
| Original release-state baseline | `ff63b22` | Previously created independent of frontend; Work's add/add document conflict was reconciled without discarding either history |
| Development CI | PR #4, `17dcf7c` | Reviewed and integrated, non-deploying development PR/push workflow |
| Governance controls | PR #6, `8ec0a4d` | `AGENTS.md`, governance policy and ownership/overlap checks; previous 40/40 validation passed |
| Trusted-check source (NOT activated) | PR #8, `6971696` | Independent GitHub App checker code only; 57/57 tests and post-merge CI passed |
| **Public frontend / classroom / content contract** | **PR #1, head `7910dcd`, merge `c381cb6`** | **Merged via reviewed PR into development, not production** |

**Frontend PR #1** carried exactly the previously approved 30 changed paths. Work's final merge head `7910dcd2a96380973ebb69f021b59a5ad1207adf` incorporates all preceding development/governance/security commits via history-preserving merges. Work's earlier validation tree `65b2409...` and subsequent `fd05912...` were superseded by exact final tree `26ccb5f4e73a4c49132950f2c66d7519f0e6501d`.

**Final PR validation:** <https://github.com/codewptech/skyinnk/actions/runs/43226136393> — exact PR head `7910dcd` **SUCCESS**, 67 tests passed / 0 failed, governance role/task/shared-file/overlap check, locked dependency install, Prisma validate/generate, Nuxt types/build and 354-artifact secret-marker scan.

**Post-merge validation:** <https://github.com/codewptech/skyinnk/actions/runs/43234744439> — exact development HEAD `c381cb6` **SUCCESS**, 67 tests passed / 0 failed, Prisma validation/generation, Nuxt production build and 354-artifact scan. Governance PR-only check correctly skipped on a development push. These are CI verification, not end-to-end browser or production validation.

**Work reports** a locally run isolated production-fixture HTTP smoke suite at the exact final PR source: published course, video/text lesson headings, public resource, sitemap, unpublished/legacy 404 and cache behavior passed. Chat 03 inspected the source and exact GitHub CI logs but did **not independently rerun** Work's fixture HTTP suite or a real browser.

## What is actually implemented in non-production V1

| Route or behavior | Source / behavior | Verification boundary |
| --- | --- | --- |
| `/` | Replaced Coming Soon with responsive guest-facing homepage, honest subject preparation text and optional Auth0 sign-in controls | Nuxt build, lightweight tests and fixture HTTP; real tenant sign-in still pending |
| `/courses` | Public published-course listing; deliberate empty state while no real courses approved | Build/tests and fixture HTTP |
| `/courses/[courseSlug]` | Public released course detail, ordered modules and lesson links; unknown/unpublished course => 404 | Fixture HTTP; no real reviewed course yet |
| `/courses/[courseSlug]/lessons/[lessonSlug]` | Stable route-based classroom for video/text lessons, collapsible desktop syllabus, mobile dialog, Overview/Notes/Resources tabs and next/previous navigation | Source/type/build/fixture tests; real browser history, dialog and video persistence unverified |
| `/sitemap.xml` | Canonical homepage/catalogue and only manifest-published course/lesson URLs | Fixture HTTP; no unpublished sitemap URLs |
| `/api/v1/health` | Existing liveness route | Local automated/HTTP checks; production state not inferred |
| `/api/v1/ready` | Existing database readiness boundary | Mocked success/failure checks; live Neon untouched |
| `/api/v1/auth/sync` | Existing Auth0 POST-only sync/CSRF/rate-limit contract | Unit/HTTP boundary checks; real Auth0 tenant login/logout not yet exercised |
| `/auth/*` | Existing Auth0 SDK-managed routes, **not renamed** | Integration preserved; full real login flow pending |

**Publication-only content model:** `content/catalogue.json` has `{"schemaVersion":1,"courses":[]}`. Thus **zero educator-approved real courses and zero real lessons are currently published**. Do not claim the test fixtures are live lessons or artificially mark a course published. School scope starts with free Class 10 Mathematics and English; Class 11 commerce previews require approved materials. Publication requires stable source migration keys, public/published review metadata, valid ordering and routes. Review must come from an actual educator/content owner, not fabricated metadata.

**Resources:** only reviewed local `/resources/public/*` paths from the manifest are allowed. Build-time checks enforce file existence, size, real-path containment and exclude unlisted resource files. Markdown renderer disables raw HTML, uses constrained link/image policies, and renders bounded KaTeX without trusting source macros. YouTube embeds require student action before loading third-party media; actual media consent/rights and playback must be checked with real lessons. Static public resources are **not protected paid-course delivery**.

**Access boundary:** guests can discover released public content without signup. Signing in does **not** equate to course enrollment, purchase or entitlement. No V1 persistence/authorization code here should be described as providing paid access. Existing Auth0-linked `User` and original `20261104000000_create_auth0_user` migration remain intact. The experimental 66-model Schema V4 was **not** applied to V1 or live Neon.

## Release-critical unfinished work

1. **Real reviewed educational content:** publish approximately 4–6 substantial Class 10 Mathematics/English lessons with educator sign-off, usable Markdown notes, and approved/rights-cleared videos/resources. Ensure accurate publication metadata and a passing build.
2. **Real-browser / mobile acceptance:** test desktop and mobile classroom dialog/focus, tabs, route changes and history, previous/next behavior, video consent and state, offline/404 behavior and resource previews/downloads. Prior Chromium attempt failed before page load because socket/process-singleton operations were not permitted; **no successful browser run is asserted**.
3. **Auth0 regression:** real Universal Login/logout/session and authenticated sync behavior on the approved tenant, without requiring login for guest material. No live Neon migration.
4. **Legal / privacy / security release review:** approve and verify privacy/terms, cookie/analytics consent, public-media rights, external-player behavior, SEO, accessibility and link integrity. Existing legal content is not independently signed off.
5. **Operational release verification:** reproducible container build, safe environment/configuration, production health/readiness, backups/rollback plan and an explicit owner release decision. These are **future gates**, not authorization for a release now.
6. **Technical integration/automation:** Work owns V1 UI/content and browser acceptance; Chat 03 owns /api/v1, Auth0, authorization compatibility, CI, source integrity and this canonical release-state record. Any new API contract must be coordinated before consumers depend on it.

## V1 / V2 boundary — authoritative ADR-069

**V1:** fast, public, mobile-responsive, guest-accessible learning discovery and published free lessons, course pages, classroom, Markdown notes/resources, optional existing Auth0 and launch-safety safeguards.

**V2 (approved, not cancelled):** complete academic PostgreSQL models/ERD, persistent enrollments and lifetime entitlements, learner dashboard/My Courses/Continue Learning and durable progress, Cashfree online payment, immutable purchases/invoices, protected enrolled resources, educator-managed CMS, Solved Questions, private doubts, notifications and editorial. Do **not** silently scope these as implemented V1 backend features; any material release-scope change needs Architecture HQ approval.

## Governance and non-production safety

- `main` is production-only. No direct integration pushes, history rewriting or owner emergency bypass. Every new Chat 03 implementation requires a fresh `chat03/task-*` branch from the latest remote integration HEAD, an open task issue, exact shared-file reservations, and reviewed PR with actual CI.
- Work owns V1 frontend, course content and classroom. Chat 03 is integration steward and the **only editor** of this release-state file. Coordination source: <https://github.com/codewptech/skyinnk/issues/2>.
- Issue #7 / Smiley: owner reports App registered and installed, but its independent service **is not hosted or active**; no webhook/required check or separate-identity rollout. Owner explicitly **paused** hosting, ruleset activation, credential migration and expenditure. Issue #7 remains open/deferred, not a condition for V1 non-production integration.
- No production deployment, live Neon migration, production credential change or modification to `main` is performed by this release-state update.

## Historic evidence and references

Earlier Work milestones (PR #1): `ff547357` original source delivery, `87e3318` initial reconciliation, `d73acab` governance refresh, `7910dcd` final security baseline refresh. Previous 30/30 and 50/50 tests reflected their then-current sources and are retained as history; **67/67** is the current merged-source test count.

Supporting release notes remain in `docs/releases/V1-REVIEW.md`, `V1-CONTENT-INTAKE.md`, `V1-INTEGRATION-HANDOFF.md` and `V1-TECHNICAL-BACKLOG.md`; some descriptions predate the merge and must not override this verified canonical status. The approved release architecture is `docs/architecture/ARCHITECTURE-DECISIONS.md` (ADL v3.1).
