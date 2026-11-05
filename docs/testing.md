# Testing and CI

## Commands

Use the installed dependencies and Node 24.22+ (verified locally on 24.22.1):

```sh
npm run check:all
npm run test:all
```

Neither command requires Docker, PostgreSQL, database credentials, Chrome, or
remote application services. Do not configure a test database.

`check:all` runs `scripts/check.mjs`. It supplies unreachable local database URLs
and dummy private Auth0 values, overriding local `.env` values in its child
processes. It validates the Prisma schema, generates Prisma Client once, checks
Nuxt types, builds production once, and scans every regular output file for both
injected secret markers. A failed command or exposed marker exits nonzero.
It never applies migrations or requests a database connection. Prisma CLI and
Client remain exactly 6.19.3. Normal dependency installation may also run Prisma's
own package lifecycle; the validation commands contain only one explicit generation.

`test:all` directly invokes Node's test runner over `tests/*.test.mjs`. It needs
no production output, Nuxt-generated artifacts, generated Prisma Client, or
previous `check:all` run. Module mocks use Node's built-in experimental module-mock
API, enabled explicitly by the script; this is not a third-party framework.
Tests run sequentially in one process so every individual case is reported in
this Node environment. No test may silently skip, use `only`, or hide failures.

For a focused run, use the same Node flags and pass one category:

```sh
node --experimental-test-module-mocks --test --test-isolation=none tests/http.test.mjs
```

## Structure and boundaries

| File                    | Responsibility                                                                                                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/core.test.mjs`   | Claim normalization and private-data exclusion, bounded persistence-error recovery, client eligibility/identity/freshness, request deduplication and cooldown.                                                                                      |
| `tests/http.test.mjs`   | Actual H3 handlers with in-process Request/Response dispatch: CSRF/session admission, minimal JSON, sanitized errors, quotas, liveness/readiness decisions. Isolated Node streams/responses exercise cookie clearing, body bounds and cache policy. |
| `tests/routes.test.mjs` | Actual Vue component server rendering and Unhead metadata for public pages/account presentation; isolated analytics loader opt-in and single insertion.                                                                                             |
| `tests/support.mjs`     | Small persistence boundary double shared by core/HTTP tests. No Prisma client is instantiated.                                                                                                                                                      |

Tests assert public results, rejected requests, permissible writes and emitted
markup/headers. They do not snapshot source text or assert incidental component
classes. New behavior normally belongs in an existing category.

The HTTP adapter opens no sockets or HTTP servers. Auth0's verified-session
provider and Prisma persistence are explicit doubles; token verification and
actual SQL are outside its assurance. The rate limiter, claim mapper, route
handlers and security middleware are actual application code.

The rendering tests use the already installed Vue compiler, SSR renderer, Unhead
and TypeScript compiler. Small Nuxt shell/link/user adapters supply the component
context. They do not boot Nuxt, launch a browser, or prove client hydration.
The analytics test uses a minimal DOM double and never downloads GTM.

## CI and production boundary

The single `ci` job has five steps: checkout, Node setup, `npm ci`, `check:all`,
then `test:all`. There are no service containers, database URLs, migrations,
Docker commands, Chrome discovery, browser launches, or extra test jobs in CI
validation. Existing npm caching is unchanged. There is one dependency install
and one host production build.

The complete existing `deploy` job is preserved byte-for-byte. It remains
push-only and depends on successful `ci`. Its production Docker builds, exact
commit safeguard, Prisma migration before startup, health checks and database
readiness check remain intact. Production Docker is intentionally independent
of the infrastructure-free validation job.

No push, merge, PR creation or deployment is part of this rewrite. The existing
pull-request event targeting `main` provides validation without the push-only
deploy job, if an owner later submits the changes for hosted review.

## Intentionally removed assurance

The old tests directory was replaced, including every legacy test and helper.
There are no retained database, Docker, browser, TLS/OIDC, schema lifecycle,
cleanup or prerequisite fixtures. No test-only dependency needed removal: the
existing dependencies remain required by the app or its build/toolchain.
The redundant test alias and focused browser script were removed; seven scripts
remain, including the two primary validation commands and normal Nuxt operations.

This lightweight suite deliberately does **not** establish:

- PostgreSQL UUIDv7 defaults, triggers, constraints, native upserts, concurrent
  writes, migrations, schema isolation or real connectivity/readiness recovery.
- Docker context exclusion, actual image contents/native libraries, image startup,
  container cleanup, deployment migration execution or runtime outage recovery.
- Signed OIDC discovery/TLS/PKCE/callback/logout, encrypted session-cookie round
  trips, or the actual Auth0 SDK/production tenant's authentication decisions.
- Browser hydration, cookie transmission, client-side SPA navigation, layout,
  keyboard focus or blocked remote-script behavior.
- Real Cookiebot consent, GA4 collection, GTM tag configuration, Neon, Cloudflare,
  production hosting or legal compliance.

Mocked persistence/session tests and component SSR provide useful local contract
checks, not equivalent integration assurance. Those removed checks are not
pending mandatory CI suites and are not represented as passing. Production's
existing migration and readiness gates still execute during approved deployment.
Owner/environment release checks remain in `analytics-and-legal.md` and
`auth0-user-sync.md`.

## Verification record

November 5, 2026, Node 24.22.1, using the existing installed dependencies:

| Command             | Result                                                                                                                       | Wall-clock time, including npm startup |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `npm run check:all` | Passed schema validation, one client generation, Nuxt type check, one build and scanning 237 artifacts for injected secrets. | 23.175 s                               |
| `npm run test:all`  | 19 passed, 0 failed, 0 skipped; all three categories discovered.                                                             | 1.620 s                                |

These commands ran in the documented order with database/Auth0 credential
variables unset in the invoking environment. Logs are
`/tmp/skyinnk-rewrite-check.log` and `/tmp/skyinnk-rewrite-tests.log`; measured
command results are in `/tmp/skyinnk-rewrite-results.json`. The Node test runner
reported 1.255 s internally, excluding npm startup. Times are observations on this
machine, not a hosted-CI performance guarantee.

An independent run temporarily removed `.output`, `.nuxt`, and generated Prisma
Client and unset service credential/tool variables: all 19 cases passed in
1.772 s including npm startup. The artifacts were restored afterward. An
intentional failing test returned nonzero; its temporary file was removed.

Workflow YAML parsing and embedded shell syntax passed. Assertions confirmed five
CI steps, one install, no services/infrastructure, the required ordering, deployment
gating, and byte-for-byte preservation of the deploy job. Dependency inspection
confirmed Prisma CLI/Client 6.19.3. Source/lockfile/configuration hash comparisons,
formatting, script/import reference checks and `git diff --check` passed.
`actionlint` is unavailable; hosted GitHub Actions was not executed. No push,
merge, PR creation, production database operation or deployment occurred.
