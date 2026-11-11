# Skyinnk V1 — Release State

**Updated:** 2026-11-11  
**Status:** Development baseline verified; public learning release not implemented or deployed  
**Repository:** `codewptech/skyinnk`  
**Integration branch:** `development/v1-public-launch`  
**Verified baseline commit:** `3217efa91254d1e8fc06c7138f22c7b3cf9122f7`  
**Production revision:** Not authorized or recorded

## Verified commits

- `4fe0d24` — Move Skyinnk-owned health, readiness and user-sync endpoints under `/api/v1/`; update callers, probes and tests.
- `3217efa` — Record approved V1 public-learning/V2 complete-platform release split in ADL v3.1.

## Actual implementation state

- **Homepage:** Existing Coming Soon page; V1 replacement pending.
- **Course catalogue:** Pending implementation.
- **Published syllabus/course detail:** Pending implementation.
- **Route-based public classroom:** Pending implementation.
- **Reviewed lessons:** None verified as published in this branch.
- **Content storage:** Plan is repository-managed Markdown and explicitly published public manifest, with stable source migration keys for future V2.
- **Auth0:** Existing integration preserved. Public lessons in V1 must not require sign-in.
- **Database:** Existing Auth0-linked User and original migration retained; 66-model Schema V4 is V2 preparation only, not applied to production.

## Latest tests reported by developer

On the local `development/v1-public-launch` checkout after Task 01: `npm run test:all` 20/20 passed; `npm run check:all` passed Prisma 6.19.3 validation and generation, typecheck, Nuxt production build, and 237-artifact secret-marker check. These are local baseline results, not evidence that V1 routes or final guest/browser journeys pass.

## V1 remaining release-critical work

1. Public-only course and lesson content model, stable routes and strict publication allowlist.
2. Responsive homepage, catalogue, course detail and syllabus.
3. Shared route-based classroom supporting video and text-only lessons, notes and approved public resources.
4. Approximately four to six substantial educator-reviewed lessons in Class 10 Mathematics and English; publish Class 11 commerce previews only when real material exists.
5. SEO and mobile/accessibility checks; guest and Auth0 regressions.
6. Accurate, reviewed legal notices and verified consent behavior before analytics.
7. Complete verification of release, actual Git revision, rollback and separate owner approval before any production deployment.

## Deferred intact to V2

Academic PostgreSQL models and full educator CMS; StudentProfile, canonical Enrollment and lifetime protections; learner progress/dashboard; Cashfree, immutable purchases and invoices; protected paid media; Solved Questions, practice, private doubts/inbox, notifications and editorial infrastructure. Schema V4 executable validation is tracked separately.

## Safety and coordination

Do not push or merge to the production-deploying `main` without owner approval. No live Neon migration, destructive application-data operation or material live infrastructure change is authorized. Record new source files, source migration keys, test evidence, git commits and deployed revision when they actually exist.
