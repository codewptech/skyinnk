# Skyinnk V1 — Shared execution checklist

Updated: 11 November 2026. Target: 18 November 2026, conditional on release gates.
Integration owner: V1 Work/Codex; Chat 03 remains backend/V2 owner. Branch: `work/v1-public-learning-integration` (published on GitHub); target `development/v1-public-launch`.

| ID | Work | State | Owner / evidence / next action |
|---|---|---|---|
| V1-01 | Inspect GitHub and reconcile Chat 03 | Done locally | Latest remote baseline `ff63b22` (historical start `3217efa`); Chat 03 API commit `4fe0d24` retained unchanged; prior V1 batch reconciled against actual remote |
| V1-02 | Non-production remote integration branch | Done | Published verified source at `ff54735`; [draft PR #1](https://github.com/codewptech/skyinnk/pull/1) targets `development/v1-public-launch`; not merged |
| V1-03 | Public content contract | Implemented + tested | Stable source keys, review/publication checks, course-wide slug uniqueness, physical resource allowlist; `tests/v1-content.test.mjs` |
| V1-04 | Homepage, catalogue, course details | Implemented; SSR tested | Honest empty catalogue, canonical URLs, ordered released syllabus, correct nested lesson routing; visual acceptance remains |
| V1-05 | Route-based classroom | Implemented; type/build/SSR tested | Shared course context, responsive sidebar/dialog, video/text mode, accessible tabs, prev/next across modules; interactive browser checks pending |
| V1-06 | Markdown/KaTeX and resources | Implemented + unit/SSR tested | HTML disabled, unsafe links/remote images blocked; reviewed local downloads with type/size; five rendering/security tests |
| V1-07 | SEO/publication safety | Implemented + tested | Metadata, canonical pages, published-only sitemap, robots rules, build-time validation; real-course indexing awaits content |
| V1-08 | Lightweight regression/build | Passed | Node 24; npm ci, 30 tests, Prisma validation/generation, typecheck, production build and secret-marker scan; no database connection |
| V1-09 | Production HTTP fixture smoke | Passed | Isolated synthetic video+text course, 14 HTTP requests; source catalogue never modified; opt-in smoke runner delivered |
| V1-10 | Browser, mobile, keyboard and history smoke | Blocked environment | Chromium/Nitro dev-worker socket restriction; shared browser cannot reach execution preview. Run `scripts/smoke-v1.mjs --isolated-fixture` on a working browser runtime |
| V1-11 | 4–6 substantive reviewed lessons | Blocked content | Educator supplies/reviews notes, learning objectives, media rights and resources; zero published lessons today; see `V1-CONTENT-INTAKE.md` |
| V1-12 | Accurate Privacy/Terms | Blocked review | Owner/responsible reviewer provides approved launch text, including minors/Auth0 handling. Existing legal templates are unapproved |
| V1-13 | Real Auth0 login/logout/sync | Pending controlled test | Requires working non-production tenant/callback or owner manual smoke; mocks are not live authentication evidence |
| V1-14 | Container, recovery and release review | Pending | Docker context omission fixed; container build, backup/rollback rehearsal and external monitors still require operational validation |
| V1-15 | Owner-approved production release | Not authorized | No main push, production deployment, live migration or infrastructure operation performed |
| V2 | Full database/CMS/enrollment/payments/doubts | Separate track | Chat 03; original User schema and migration preserved, Schema V4 not installed |

## File ownership and next integration

- API baseline: Chat 03 Task 01; reconcile future changes by diff/cherry-pick, never overwrite its working tree.
- Public content contract: `shared/public-content.ts`, `scripts/validate-public-content.ts`, `content/catalogue.json`.
- Discovery: homepage and course index/detail routes.
- Classroom: lesson page and `app/components/classroom/`.
- Notes: `MarkdownNotes.vue`, `render-markdown.ts`.
- QA: lightweight tests and opt-in `scripts/smoke-v1.mjs`.
- Any new Chat 03 work must be compared with this branch before integration. This task cannot directly control another ChatGPT conversation.

No task marked “implemented” is a claim of production deployment or educator publication approval.

Permanent workflow: GitHub → Codex/Work → tested commits → development branch → controlled release. ZIP and manual patch handoffs are retired as the normal workflow.

PR #1 reconciliation: retain both release-state evidence records and both commit histories; Work resolves the feature branch, Chat 03 provides technical review. Re-run tests/build/public-content HTTP smoke and verify GitHub mergeability before declaring the divergence resolved.

Reconciliation validation completed: fresh npm ci, 30/30 tests, check:all (Prisma/types/build + 354-artifact secret scan) and isolated production public-content/HTTP smoke passed. Application source unchanged; browser, Auth0, content/legal and operational release gates remain open. GitHub mergeability is verified on PR #1 after feature-branch publication.
