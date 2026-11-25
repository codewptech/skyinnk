# Skyinnk V1 — Canonical release state

## Latest verified technical checkpoint — 25 November 2026 (subsequent integration)

**Verified source baseline:** `8011daa5f297e6e176c16fb50f1c9346a8ff240f` (PR #136 merged into nonproduction development). **Production main:** `6bfc342e89a19b76570565854b643387d0139e90`, unchanged. This is the pre-documentation baseline, not the SHA of this future documentation commit. [Exact development push CI 45608316853](https://github.com/codewptech/skyinnk/actions/runs/45608316853) and [routing 45608316898](https://github.com/codewptech/skyinnk/actions/runs/45608316898) completed SUCCESS. At the immediately preceding merge #134, [Development CI 45604827626](https://github.com/codewptech/skyinnk/actions/runs/45604827626), [routing 45604827594](https://github.com/codewptech/skyinnk/actions/runs/45604827594), [integrated browser 45604827604](https://github.com/codewptech/skyinnk/actions/runs/45604827604) and [WCAG audit 45604827562](https://github.com/codewptech/skyinnk/actions/runs/45604827562) all completed SUCCESS. Browser evidence is for #134, not a real released course or print/device acceptance.

The following thirteen commits are in the verified development ancestry since the preceding documented baseline `4a2f845c1aa3d961389ca493aea76bd2b5ab14f1` (source integration history, not a claim that every workflow was re-read in this refresh):

| PR | Integrated change | Exact development commit |
| --- | --- | --- |
| #111 | Prior release evidence refresh | `5aff0d8edbf1c37e5e6c84ca95dd1f1bafa35167` |
| #112 | Formal email model/editorial correction | `d9dcbce8dde969868319b6d03ee2f59c9c22bdcb` |
| #114 | Explicit review timestamp timezone | `cd55f35c7ade7720b8d3c797f0534603d1580d95` |
| #116 | Legal factual descriptions of guest learning and video | `aaa548e91e0c46c24d3dcc4204bf5d1d3687cf85` |
| #118 | Repeatable integrated guest browser checks | `e87b08517e0c480aa6818c79faed0665f6e3e533` |
| #120 | Repeatable disposable PostgreSQL/recovery checks | `8aedfd90b8baab856f2120527dbbf01ed39792f2` |
| #122 | Learner catalogue projection separated from approval metadata | `1ce118afcb3b73d80c43c78f5671f44d111624fd` |
| #124 | First-publication-safe browser and accessibility acceptance | `acbf2c94e3711327f54114e368ee86aa70ae991b` |
| #128 | Two additional mathematics draft lessons | `e2a1408e6abccdc36bdcf99932e503b6dfcfd78d` |
| #130 | Read-only reviewed-text catalogue candidate preparation | `8681c172e2f05c4183df168942abff50278e7d37` |
| #132 | Accessible native notes tables and keyboard scrolling | `0073c5d0bb1991fab33452afa1a402a3eac028b1` |
| #134 | Strict actual-draft Markdown/KaTeX preflight | `6866bd7465d9d50758e3f8e7b714e93d75a65c7c` |
| #136 | Local printable educator-review packet exporter | `8011daa5f297e6e176c16fb50f1c9346a8ff240f` |

**Actual release gates and queue at this checkpoint:**

- `content/catalogue.json` re-read at this SHA: schemaVersion 1, empty courses array. Zero actual published courses or educator-approved learner lessons.
- Seven original Class 10 draft candidates (M-01–04, E-01–03) are readable in the public GitHub repository but are not published in the learning application. Strict rendering and local packet exporter are technical aids only; exact draft hashes and blank approval fields do not constitute signoff. Actual educator, board/year, rights and final-revision decisions #108/#127 remain open. Select 4–6 genuinely approved lessons under existing V1 scope. Review the actual learner layout and media separately.
- #133 and #135 completed and closed after verified merge and postmerge workflow success. PR #126 / #125 is still **unmerged**; current candidate `975c41f5c2711de5f0fb75724770449e12216cc3` passed [candidate CI 45608417072](https://github.com/codewptech/skyinnk/actions/runs/45608417072) and [routing 45608417062](https://github.com/codewptech/skyinnk/actions/runs/45608417062), with same-author advisory review, but requires scoped owner authorization or independent sensitive-governance review and renewed base reconciliation if development moves. No policy change integrated by this documentation.
- Open issues at source checkpoint, before this documentation claim: #2, #58, #59, #108, #125, #127. #59 remains 0/2 qualifying unattended execution cycles; interactive author-led integration and routing are not runtime proof. No additional paid services, hosting or automatic worker activation.
- Independent release-level technical assurance, real device/screen-reader/contrast/print and media acceptance, real approved Auth0 tenant login/logout/session/sync, privacy/minors/rights/legal review, live operational verification and explicit owner release authorization remain external gates. No main merge, deployment, live DB migration or actual publication. Owner's temporary same-author development exception does not substitute for these gates.

Previous snapshots below are retained verbatim as historical records.

---

## Latest verified technical checkpoint — 25 November 2026

**Development source baseline:** `4a2f845c1aa3d961389ca493aea76bd2b5ab14f1`; **production main:** `6bfc342e89a19b76570565854b643387d0139e90`, unchanged. Both refs re-fetched on 25 November before this documentation task. No open PRs at that checkpoint; #2, #58, #59 and #108 remain open. This describes the pre-documentation source, not any future commit or release.

The ten-PR development batch #101, #91, #93, #96, #97, #99, #103, #105, #107 and #109 was integrated under the specific documented owner authorization for same-author technical COMMENT review plus CI; this is **not independent release-level assurance** and not a standing waiver. Final [Development CI 45563237254](https://github.com/codewptech/skyinnk/actions/runs/45563237254) and [routing 45563237261](https://github.com/codewptech/skyinnk/actions/runs/45563237261) job conclusions rechecked successfully. Recorded integration evidence reports 221 application tests, 30 governance tests and Prisma/types/Nuxt production build passing. Last user-facing change #105 has [hosted Chromium axe 45562574856](https://github.com/codewptech/skyinnk/actions/runs/45562574856) SUCCESS; manual assistive technology and contrast acceptance are not implied. Full batch detail: [V1 closeout](https://github.com/codewptech/skyinnk/issues/58#issuecomment-7155193729).

| Area | Actual status |
| --- | --- |
| V1 application source | Ten-PR batch integrated; no outstanding source PR at observed baseline |
| Publication | `content/catalogue.json` directly rechecked, zero approved courses |
| Editorial intake | Five original Class 10 drafts in `docs/content-review/v1-class10/`; #108 open, genuine educator/rights approval missing |
| Release-level assurance | Independent technical review, real physical device/screen reader/contrast, actual content/media and Auth0 tenant/session tests remain open |
| Legal / operations | Verified operator, privacy/minors/consent, media rights, production readiness and separate owner release authorization outstanding |
| Permanent SDC | #59 remains open, recorded 0/2 qualifying unattended cycles; routing success is not agent dispatch |
| Production | Not authorized or performed; no live data or main changes |

Owner's reported weekly allowance is 1%; temporary interactive HQ coverage of existing six role duties is not a replacement permanent SDC architecture, independent authenticated review, or proof of autonomous execution. No automatic worker, hosting, payment, deployment or publication authorization follows. All earlier snapshots below are retained as historical evidence; use the latest checkpoint and live GitHub for current state.

---


## Latest verified technical acceptance — 21 November 2026

**Last independently verifiable application/test baseline before this documentation-only change:** `3714ae1e8eeb9cde2d38f8a51c3763c49527861e`; [post-merge Development CI SUCCESS 44900429542](https://github.com/codewptech/skyinnk/actions/runs/44900429542). The current GitHub development ref and [global V1 milestone #58](https://github.com/codewptech/skyinnk/issues/58) remain authoritative for any later documentation-only commit. **Production `main`:** `6bfc342e89a19b76570565854b643387d0139e90`; no V1 production release or live Neon migration authorized/performed.

| Integrated PR | What changed | Exact postmerge validation |
| --- | --- | --- |
| #14 | First-publication regression test | [Development CI 44896930356](https://github.com/codewptech/skyinnk/actions/runs/44896930356) |
| #55 | Six-role SDC charter, **documentation only** | [Development CI 44897212626](https://github.com/codewptech/skyinnk/actions/runs/44897212626) |
| #18 | Reviewed public resource SHA-256/format/size verification | [Development CI 44897365514](https://github.com/codewptech/skyinnk/actions/runs/44897365514) |
| #20 | Classroom keyboard, tab and mobile dialog corrections | [Development CI 44897531287](https://github.com/codewptech/skyinnk/actions/runs/44897531287) |
| #56 | Guest Chromium runner with 320/330px overflow control | [Development CI 44897665280](https://github.com/codewptech/skyinnk/actions/runs/44897665280) |
| #16 | Auth0 timestamp-safe write source and mocked tests | [Development CI 44897891096](https://github.com/codewptech/skyinnk/actions/runs/44897891096) |
| #30 | Corrected canonical release/testing historical evidence | [Development CI 44898437701](https://github.com/codewptech/skyinnk/actions/runs/44898437701) |
| #28 | Disposable backup/restore/recovery rehearsal and owner-gate **proposal only** | [Development CI 44899733987](https://github.com/codewptech/skyinnk/actions/runs/44899733987); [real Docker/PG18 recovery 44899600841](https://github.com/codewptech/skyinnk/actions/runs/44899600841) |
| #65 | Actual empty/fictional published guest Chromium/Nitro/HTTP suite | [Development CI 44899981477](https://github.com/codewptech/skyinnk/actions/runs/44899981477); [real Chromium 44899981497](https://github.com/codewptech/skyinnk/actions/runs/44899981497) |
| #67 | Actual concurrency and freshness tests against PostgreSQL 18 | [Development CI 44900429542](https://github.com/codewptech/skyinnk/actions/runs/44900429542); [real PG18 44900429586](https://github.com/codewptech/skyinnk/actions/runs/44900429586) |

**Technically verified on disposable/fictional infrastructure:** Chromium 141 at 320/375/768/1365px with touch, keyboard, 320/330px overflow negative control, safe Notes, lesson navigation/history, tab/dialog focus; exact served SHA-256 resource bytes, `nosniff` and unlisted-resource denial; PG18 UUIDv7 first-sync concurrency and timestamp watermark integrity; local-only Docker/PG18 backup restore, expected 503 unreadiness and retained-image rollback. These are actual CI jobs, **not** real-course educational, real-identity-provider or production acceptance. Source reviews written inline by Architecture HQ are advisory COMMENT records, not separately authenticated SDC 03 Work approvals.

**Real V1 release gates remain OPEN (#58):** The checked-in publication catalogue still contains **zero educator-approved courses**. Supply and formally review substantive Class 10 Mathematics/English lessons, objectives, Markdown notes, and legally usable videos/resources; real devices/assistive technology and media playback; an approved Auth0 test-tenant Universal Login/callback/logout/session flow; operator identity/legal/privacy/cookie/analytics/under-18 obligations; and an explicit owner-approved release with real production rollback and monitoring. No provider secrets, live data or production deployment were used by these tests. Cashfree and V2 academic models remain separate approved V2 work. SDC execution controller #59/#62/#63 is **deferred and not operational**.

Everything below the divider is a **dated historical source snapshot** and must not be mistaken for the present status or exact test count.
---

**Last verified:** 19 November 2026 (GitHub and pinned independent audit evidence)\
**Scope:** ADR-069/070, seven-day-target **public/free-learning V1**, not the full V2 learning-commerce platform\
**Repository:** `codewptech/skyinnk`\
**Shared integration branch:** `development/v1-public-launch`\
**Verified integration HEAD at this review:** `c1250c40b07ef37894a927cb64249892989bbf84`\
**Production `main` HEAD independently observed:** `6bfc342e89a19b76570565854b643387d0139e90`\
**Production release/deployment of this V1:** **NOT AUTHORIZED, NOT PERFORMED OR VERIFIED**

> **Status:** The V1 public frontend, publication foundation and guest read APIs are integrated in development. Production V1 remains blocked on approved educational content, real learner and tenant acceptance, legal/media approval and release safeguards.

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
| Canonical release-state follow-up | PR #10, `fe06774` | Recorded the reviewed frontend merge. |
| Guest-safe public reading APIs | PR #12, `c1250c4` | Merged versioned public course list, course outline and released lesson APIs. |


**Frontend PR #1** carried exactly the previously approved 30 changed paths. Work's final merge head `7910dcd2a96380973ebb69f021b59a5ad1207adf` incorporates all preceding development/governance/security commits via history-preserving merges. Work's earlier validation tree `65b2409...` and subsequent `fd05912...` were superseded by exact final tree `26ccb5f4e73a4c49132950f2c66d7519f0e6501d`.

**Final PR validation:** <https://github.com/codewptech/skyinnk/actions/runs/43226136393> — exact PR head `7910dcd` **SUCCESS**, 67 tests passed / 0 failed, governance role/task/shared-file/overlap check, locked dependency install, Prisma validate/generate, Nuxt types/build and 354-artifact secret-marker scan.

**Post-merge validation:** <https://github.com/codewptech/skyinnk/actions/runs/43234744439> — exact development HEAD `c381cb6` **SUCCESS**, 67 tests passed / 0 failed, Prisma validation/generation, Nuxt production build and 354-artifact scan. Governance PR-only check correctly skipped on a development push. These are CI verification, not end-to-end browser or production validation.

**Current verified source.** The exact development push at `c1250c4`
passed Development CI. Its PR-only policy step was skipped as designed.
The independent audit on that SHA passed 75 Node tests and the production
build with a 362-artifact secret-marker scan. Chromium passed 15 fictional
course smoke groups. A local Docker image built with the cloud CA passed
liveness and readiness with disposable PostgreSQL 18. Real educational
materials, live tenant flows and production operations remain separate gates.
[Exact-head GitHub CI](https://github.com/codewptech/skyinnk/actions/runs/43237307644)

## What is actually implemented in non-production V1

| Route or behavior | Source / behavior | Verification boundary |
| --- | --- | --- |
| `/` | Replaced Coming Soon with responsive guest-facing homepage, honest subject preparation text and optional Auth0 sign-in controls | Nuxt build, lightweight tests and fixture HTTP; real tenant sign-in still pending |
| `/courses` | Public published-course listing; deliberate empty state while no real courses approved | Build/tests and fixture HTTP |
| `/courses/[courseSlug]` | Public released course detail, ordered modules and lesson links; unknown/unpublished course => 404 | Fixture HTTP; no real reviewed course yet |
| `/courses/[courseSlug]/lessons/[lessonSlug]` | Stable route-based classroom for video/text lessons, collapsible desktop syllabus, mobile dialog, Overview/Notes/Resources tabs and next/previous navigation | Fictional Chromium history, navigation, dialog and iframe lifecycle exercised. Real learner/device acceptance remains. |
| `/sitemap.xml` | Canonical homepage/catalogue and only manifest-published course/lesson URLs | Fixture HTTP; no unpublished sitemap URLs |
| `/api/v1/health` | Existing liveness route | Local automated/HTTP checks; production state not inferred |
| `/api/v1/ready` | Existing database readiness boundary | Mocked cases and actual packaged readiness against disposable PostgreSQL 18 |
| `/api/v1/auth/sync` | Existing Auth0 POST-only sync/CSRF/rate-limit contract | Unit/HTTP boundary checks; real Auth0 tenant login/logout not yet exercised |
| `/api/v1/public/courses` | Guest summaries of released courses | Verified empty and populated fictional responses |
| `/api/v1/public/courses/:courseSlug` | Guest course outline and ordered syllabus | Verified the fictional outline and missing publication boundary |
| `/api/v1/public/courses/:courseSlug/lessons/:lessonSlug` | Guest content and projected public resource metadata for a released lesson | Verified released fictional lesson and unpublished-route 404 |
| `/auth/*` | Existing Auth0 SDK-managed routes, **not renamed** | Integration preserved; full real login flow pending |

**Publication-only content model:** `content/catalogue.json` has `{"schemaVersion":1,"courses":[]}`. Thus **zero educator-approved real courses and zero real lessons are currently published**. Do not claim the test fixtures are live lessons or artificially mark a course published. School scope starts with free Class 10 Mathematics and English; Class 11 commerce previews require approved materials. Publication requires stable source migration keys, public/published review metadata, valid ordering and routes. Review must come from an actual educator/content owner, not fabricated metadata.

**Resources:** only reviewed local `/resources/public/*` paths from the manifest are allowed. Build-time checks enforce file existence, size, real-path containment and exclude unlisted resource files. Markdown renderer disables raw HTML, uses constrained link/image policies, and renders bounded KaTeX without trusting source macros. YouTube embeds require student action before loading third-party media; actual media consent/rights and playback must be checked with real lessons. Static public resources are **not protected paid-course delivery**.

**Access boundary:** guests can discover released public content without signup. Signing in does **not** equate to course enrollment, purchase or entitlement. No V1 persistence/authorization code here should be described as providing paid access. Existing Auth0-linked `User` and original `20261104000000_create_auth0_user` migration remain intact. The experimental 66-model Schema V4 was **not** applied to V1 or live Neon.

## Release-critical unfinished work

1. **Real reviewed educational content:** publish approximately 4–6 substantial Class 10 Mathematics/English lessons with educator sign-off, usable Markdown notes, and approved/rights-cleared videos/resources. Ensure accurate publication metadata and a passing build.
2. **Real-browser / mobile acceptance:** test desktop and mobile classroom dialog/focus, tabs, route changes and history, previous/next behavior, video consent and state, offline/404 behavior and resource previews/downloads. Fictional Chromium coverage passed on the audited commit. Verify actual reviewed content and media, real devices and assistive technology.
3. **Auth0 regression:** real Universal Login/logout/session and authenticated sync behavior on the approved tenant, without requiring login for guest material. No live Neon migration.
4. **Legal / privacy / security release review:** approve and verify privacy/terms, cookie/analytics consent, public-media rights, external-player behavior, SEO, accessibility and link integrity. Existing legal content is not independently signed off.
5. **Operational release verification:** reproducible container build, safe environment/configuration, production health/readiness, backups/rollback plan and an explicit owner release decision. These are **future gates**, not authorization for a release now.
6. **Audit remediation:** Verify the first-publication CI correction, classroom accessibility, public resource integrity, Auth0 claim freshness, dependency triage and governance changes through their independent development PR reviews. The audited baseline still contains the confirmed findings.
7. **Technical integration/automation:** Work owns V1 UI/content and browser acceptance; Chat 03 owns /api/v1, Auth0, authorization compatibility, CI, source integrity and this canonical release-state record. Any new API contract must be coordinated before consumers depend on it.

## V1 / V2 boundary — authoritative ADR-069

**V1:** fast, public, mobile-responsive, guest-accessible learning discovery and published free lessons, course pages, classroom, Markdown notes/resources, optional existing Auth0 and launch-safety safeguards.

**V2 (approved, not cancelled):** complete academic PostgreSQL models/ERD, persistent enrollments and lifetime entitlements, learner dashboard/My Courses/Continue Learning and durable progress, Cashfree online payment, immutable purchases/invoices, protected enrolled resources, educator-managed CMS, Solved Questions, private doubts, notifications and editorial. Do **not** silently scope these as implemented V1 backend features; any material release-scope change needs Architecture HQ approval.

## Governance and non-production safety

- `main` is production-only. No direct integration pushes, history rewriting or owner emergency bypass. Every new Chat 03 implementation requires a fresh `chat03/task-*` branch from the latest remote integration HEAD, an open task issue, exact shared-file reservations, and reviewed PR with actual CI.
- Work owns V1 frontend, course content and classroom. Chat 03 is integration steward and the **only editor** of this release-state file. Coordination source: <https://github.com/codewptech/skyinnk/issues/2>.
- Issue #7 / Smiley: owner reports App registered and installed, but its independent service **is not hosted or active**; no webhook/required check or separate-identity rollout. Owner explicitly **paused** hosting, ruleset activation, credential migration and expenditure. Issue #7 remains open/deferred, not a condition for V1 non-production integration.
- No production deployment, live Neon migration, production credential change or modification to `main` is performed by this release-state update.

## Historic evidence and references

Earlier Work milestones (PR #1): `ff547357` original source delivery, `87e3318` initial reconciliation, `d73acab` governance refresh, `7910dcd` final security baseline refresh. The 30-, 50- and 67-test results belong to earlier snapshots. The pinned independent audit at `c1250c4` recorded 75 passing tests.

Supporting release notes remain in `docs/releases/V1-REVIEW.md`, `V1-CONTENT-INTAKE.md`, `V1-INTEGRATION-HANDOFF.md` and `V1-TECHNICAL-BACKLOG.md`; some descriptions predate the merge and must not override this verified canonical status. The approved release architecture is `docs/architecture/ARCHITECTURE-DECISIONS.md` (ADL v3.1).
