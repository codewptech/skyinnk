# Skyinnk V1 — Independent source and smoke review

Date: 11 November 2026. Scope: reconciled Chat 03 source and public V1 implementation on `work/v1-public-learning-integration`. This is development evidence, not a production release approval.

## Findings addressed during integration

| Finding | Impact | Resolution to verify |
| --- | --- | --- |
| Course/lesson scaffold captured route parameters only at setup | Client navigation could keep showing a previous course/lesson | Reactive route lookup and invalid-route guards added to final pages; browser behavior still needs execution |
| Lesson-slug uniqueness checked only within a module | Two lessons in separate modules could share one URL | Shared catalogue validator enforces uniqueness across a course |
| Docker deny-all context omitted new content directory | Container build would fail to import the catalogue | Integration owner adds narrowly scoped approved content/shared/script build inputs |
| Publication depended on a comment and a type cast | Accidental draft/private records could enter browser assets | Shared validator and build gate require explicit public publication and review metadata; reject unsupported fields |
| Public resource paths were not checked against actual files | Missing downloads or accidental public assets could ship | Build validation checks local file existence, size, containment and allowlist |

The Auth0 SDK routes and original Prisma User/migration remain the baseline. API versioning is reconciled from Chat 03 rather than replaced. No live database, production infrastructure or deployment was accessed during this review.

## Test tooling delivered

`scripts/smoke-v1.mjs` is an opt-in HTTP and Chromium smoke runner. It is separate from the lightweight routine test command.

- `node scripts/smoke-v1.mjs --base-url http://127.0.0.1:3000 --http-only`
- `node scripts/smoke-v1.mjs --isolated-fixture --http-only --artifacts /absolute/evidence-directory`
- Add `--serve-fixture --port 4319` to keep the isolated preview running for a separate browser review; send `stop` on stdin or SIGINT/SIGTERM to stop it and clean up.
- Omit `--http-only` on a workstation with a working Chromium runtime to include client navigation, browser history, video persistence across tabs, mobile syllabus and responsive overflow checks.

Isolated fixture mode copies source into a temporary directory, supplies a clearly identified test-only course with video and text lessons across two modules, creates one public TXT resource, builds a production output and starts a local preview with intentionally unusable DB/Auth0 settings. It does not modify the real catalogue or add a production preview switch. Dependency bytes are reused through individual links in a private `node_modules` directory, excluding `.cache`; the temporary Nuxt config explicitly sets its own `.nuxt` build directory. Generated build/cache files are therefore separated from integration builds. Temporary fixture code is removed after the run when evidence is saved outside the temporary directory.

## Observed environment and execution status

- Node 24.22.1 is available.
- Playwright is installed in the runtime and Chromium is installed at `/usr/bin/chromium`.
- Chromium was actually launched twice: normal headless and a single-process/no-zygote alternative. Both failed before opening a page at `process_singleton_posix.cc` with `socket() failed: Operation not permitted (1)`. Browser tests are **blocked**, not passed.
- A Node TCP listener on `127.0.0.1` succeeded, so local HTTP preview checks can still run.
- Shared Chrome was also attempted by the integration owner, but its browser network context returned connection refused for the executor preview URL. No browser application-flow checks passed through that route.
- `node --check scripts/smoke-v1.mjs` passed.
- Isolated fixture production build **passed** (15.6 seconds in the final isolated run). The production preview rendered the exact expected course, video-lesson and text-lesson H1 titles on their individual routes and served the public TXT download, generated both lesson URLs in its sitemap, returned the required versioned health response and rejected legacy/unpublished routes. The runner completed 8 reported groups (7 HTTP assertion groups plus an explicit browser-not-run record), covering 14 HTTP requests. The real `content/catalogue.json` was never edited.
- Evidence: `qa-fixture-isolated/fixture-build.log`, `qa-fixture-isolated/fixture-smoke.log`, `qa-fixture-isolated/fixture-preview.log` and `qa-fixture-isolated/smoke-results.json` in the task workspace. Browser results remain not run in that HTTP-only fixture run; the separate Chromium launch attempts established the runtime blocker.

## Remaining release checks

Human educator/content approval, actual public media rights/availability, reviewed privacy/terms, real Auth0 tenant login/logout and synchronization, browser/mobile execution, operational backup/rollback verification and explicit owner release approval remain release gates. Test-only fixture lessons do not satisfy the real-content launch requirement.
