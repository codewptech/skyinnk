# Auth0 user synchronization v1.3

## Existing integrations and scope

Nuxt 4.6.4, Auth0 Nuxt SDK 1.3.0, Prisma/Client 6.19.3, Nitro 2.13.6, and
Node 24 are retained. No new dependencies are needed for synchronization or its
tests. The repository previously had no models, migrations, custom middleware,
rate limiter, or automated tests. The existing Prisma generator, Neon datasource,
singleton, Docker deployment, Auth0 module, and mounted authentication routes are
preserved. The singleton's development cache is named `skyinnkPrisma` to avoid a
TypeScript collision with Nitro's auto-imported `prisma` variable.

The existing Home Page moved from `app/app.vue` to `app/pages/index.vue` with its
UI intact. `app.vue` now hosts `NuxtPage` and `NuxtRouteAnnouncer`.

## Changed files

| File                                                               | Purpose                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                             | Exact requested typed User model and database defaults.                                        |
| `prisma/migrations/20261104000000_create_auth0_user/migration.sql` | Transactional PostgreSQL 18 table, indexes, version guard and timestamp trigger.               |
| `prisma/migrations/migration_lock.toml`                            | PostgreSQL migration provider lock.                                                            |
| `server/utils/prisma.ts`                                           | Preserve singleton; rename its development cache to resolve the existing type collision.       |
| `server/utils/auth0-user.ts`                                       | Validated profile mapping and identity-keyed native upsert with bounded conflict fallback.     |
| `server/api/auth/sync.post.ts`                                     | Session-only empty-body API, origin/CSRF checks and sanitized errors.                          |
| `app/app.vue`                                                      | Root page outlet and route announcer.                                                          |
| `app/pages/index.vue`                                              | Existing Home Page UI, opted into the named middleware.                                        |
| `app/middleware/auth0-sync.ts`                                     | Client-only page opt-in and bounded synchronization request.                                   |
| `app/utils/auth0-sync.ts`                                          | Scoped SDK-user observation, identity freshness, cooldown and in-flight deduplication.         |
| `nuxt.config.ts`                                                   | Disable SSR user serialization/shared response caching; derive exact immutable asset manifest. |
| `server/plugins/cache-headers.ts`                                  | Final Node response cache policy, including errors and SDK responses.                          |
| `server/types/immutable-assets.d.ts`                               | Type declaration for the server-only generated asset allowlist.                                |
| `.env.example`                                                     | Optional five-minute freshness setting; existing secret placeholders retained.                 |
| `package.json`                                                     | Separate unit/database/HTTP/browser test commands, with no new dependency.                     |
| `README.md`                                                        | Link to this implementation and review guide.                                                  |
| `docs/auth0-user-sync.md`                                          | Model, policy, per-file report, test commands and manual prerequisites.                        |
| `tests/profile.test.ts`                                            | All profile mappings, nullable/invalid claims, date normalization and identity boundaries.     |
| `tests/coordinator.test.ts`                                        | Delayed SDK initialization, freshness, deduplication, account changes and cleanup.             |
| `tests/database.integration.ts`                                    | Actual PostgreSQL defaults, UUID version, constraints, triggers and concurrency.               |
| `tests/http.integration.ts`                                        | Actual production authentication/security/status/cache responses.                              |
| `tests/browser.integration.ts`                                     | Actual client hydration, delayed profile, eligibility, switching, layout and outages.          |
| `tests/helpers/production.ts`                                      | Isolated production server and SDK-encrypted test sessions.                                    |
| `tests/helpers/browser.ts`                                         | Installed Chrome control through its native debugging protocol.                                |

Existing dependency/lockfile changes from the earlier Auth0 integration are
preserved. The v1.2 synchronization baseline installed no packages and preserved Docker/Compose.
The v1.3 audit remediation below changes Docker and CI verification; Cloudflare
configuration and production credentials remain unchanged.

## Database contract

The complete model is in [schema.prisma](../prisma/schema.prisma). Its new `User`
table has a PostgreSQL-generated `uuidv7()` primary key, unique `auth0Id`, nullable
ordinary profile columns, a nonunique email index, six flattened address columns,
and `Timestamptz(6)` profile/database timestamps. Email never identifies or merges
accounts. No tokens, passwords, sessions, secrets, or catch-all JSON are stored.

Migration `20261104000000_create_auth0_user` contains only the new table,
indexes, function and trigger, within a transaction. It checks PostgreSQL >=18
before DDL. `set_user_updated_at()` sets `NEW."updatedAt" = clock_timestamp()`
before every UPDATE, including direct SQL. `createdAt` and initial `updatedAt`
use database defaults. Prisma's `@updatedAt` is deliberately absent.

`syncAuth0User()` accepts the SDK's `UserClaims` from a verified server session.
It uses `prisma.user.upsert()` with `where.auth0Id = session.user.sub`, identical
create identity, no nested writes, and a minimal `id` selection. The update always
includes the same `auth0Id`, so even subject-only/unchanged claims cause a real
UPDATE and fire the timestamp trigger. It never supplies primary keys or database
timestamps. This satisfies Prisma v6's native PostgreSQL upsert criteria; a
single bounded retry handles an `auth0Id` P2002 conflict if Prisma falls back to
its own upsert implementation.

### Claim mapping and clearing policy

Standard snake_case claims map to corresponding camelCase columns: name parts,
nickname, preferred username, email/verification, phone/verification, picture,
profile, website, gender, birthdate, zoneinfo, locale and `updated_at`. The SDK
types explicitly declare common claims and permit other ordinary claims through
an unknown-valued index signature; every persisted claim is validated at runtime.

- Absent/undefined or invalid values preserve existing columns; new rows keep nulls.
- Explicit `null` clears a nullable column. An empty string clears a text/timestamp
  column. Whitespace within otherwise supplied text is preserved.
- Booleans accept only booleans or explicit null; missing values do not become false.
- Text must be a string without PostgreSQL-invalid NUL characters.
- An address object updates only supplied valid members; `address: null` clears
  all six address columns. Invalid address types are ignored.
- `birthdate` remains a string, including partially specified dates.
- `updated_at` accepts finite nonnegative OIDC NumericDate seconds (including zero)
  or validated ISO/RFC3339 timestamps with timezone. Impossible dates, unbounded
  values, numeric strings, and unsupported types are ignored.
- `sub` must be a nonempty, non-whitespace, NUL-free string of at most 255 characters.
  Its exact case/value is preserved.

Only claims actually present in the session are available. Default Auth0 scopes
remain unchanged. Phone/address claims remain nullable when Auth0 does not supply
them. Synchronization does not fetch the Management API or refresh profile claims:
changed provider claims become available when Auth0 renews/reissues the session.

## Session-only API and CSRF

`POST /api/auth/sync` accepts an empty body and returns `{ "synced": true }`.
The existing SDK's `useAuth0(event).getSession()` verifies/decrypts the server
session; the browser never supplies the subject or profile. Query parameters are
ignored. The browser sends `X-Auth0-Sync: 1` with same-origin credentials.

The endpoint requires an exact `Origin` matching the origin of
`NUXT_AUTH0_APP_BASE_URL`, that custom non-simple header, and `Sec-Fetch-Site:
same-origin` when supplied. Missing/null/untrusted origins, cross-site requests,
and framed request bodies are rejected with 403. Host/forwarded headers cannot
choose the trusted origin. No permissive CORS policy is added.

Missing, expired, tampered or subject-less sessions receive 401. Success is 200;
temporary connection/pool unavailability is 503; unexpected failures are sanitized
500 responses. No database details, session tokens or profile are returned or
logged by the synchronization code. Authenticated requests are now limited by the
server-side sliding window described below; client request bounds remain an
optimization rather than the enforcement mechanism.

## Server-side synchronization rate limit

The current Docker/Compose deployment runs one persistent Nitro Node process
(`node .output/server/index.mjs`), with one application service and no configured
cluster, replicas or serverless preset. An in-memory limiter fits that topology
without additional database operations, dependencies or infrastructure.

### Policy and execution order

`server/utils/auth0-sync-rate-limit.ts` implements an exact sliding-window log:
**10 admitted requests per verified Auth0 subject in any rolling 60000 ms**.
Unlike a token bucket, this does not allow an initial burst plus refills to exceed
ten requests within the same rolling minute. The private runtime configuration is:

```ts
runtimeConfig: {
  auth0SyncRateLimit: { maxRequests: 10, windowMs: 60_000 },
}
```

Override at server startup, outside `runtimeConfig.public`:

```dotenv
NUXT_AUTH0_SYNC_RATE_LIMIT_MAX_REQUESTS=10
NUXT_AUTH0_SYNC_RATE_LIMIT_WINDOW_MS=60000
```

Both settings must be positive safe integers. Invalid settings fail closed with a
sanitized 503 rather than silently disabling protection. Restart the server after
changing its runtime environment. No production secret or database change is needed.

The endpoint's execution order is:

1. Existing origin, CSRF/custom-header, fetch-site and empty-body checks (403).
2. Existing SDK server-session retrieval and subject validation (401).
3. Consume quota for the verified `session.user.sub`, synchronously before Prisma.
4. If admitted, run the existing profile mapper/upsert and return its existing result.
5. If exhausted, throw the existing-style structured 429 error without calling
   synchronization or Prisma. Set `Retry-After` to the number of seconds until the
   oldest counted admission expires, rounded up to the next integer (at least one).

The error has `statusCode: 429` and `statusMessage: "Too Many Requests"`. It does
not contain the verified subject, profile or session data. The existing final
response cache enforcement retains all three private/no-store headers, including
on 429 responses, and preserves `Retry-After`.

Changing email, IP/forwarded headers, query parameters or the session cookie's SID
cannot reset an identity's quota. The limiter runs only for this endpoint; Universal
Login, signup, callback, logout and profile routes do not consume it. Rejected
origin/session/body checks consume no quota. Admitted attempts count even if Prisma
subsequently fails, so database outages cannot be hammered with uncounted attempts.
Rejected requests do not extend the window or record additional timestamps.

### Memory, concurrency and deployment limitations

The server holds SHA-256 digests of exact subject strings, not raw identities,
tokens or cookies. Each identity has at most the configured allowance of admission
timestamps. A monotonic clock (`performance.now`) avoids wall-clock adjustments.
There is no await or database/cache I/O between quota inspection and consumption,
so concurrent requests cannot exceed the allowance within one Node process.

Storage is capped at 10000 identities. Inactive entries expire after their last
admission leaves the window and are lazily removed by bounded-frequency sweeps as
requests arrive (at most once per second with the default window). No background
intervals or per-user timers are installed. If storage is full, new identities
receive a sanitized 503; active entries are never evicted to bypass their quotas.
Existing identities retain their own allowances, and expired entries free capacity.

**This is a per-process, volatile limit.** Restarts, rolling deployments and HMR
clear it. Additional Node workers/containers would each have their own allowance;
it is not a global limit across replicas. If that topology changes, review a shared
atomic limiter before claiming global enforcement. No Redis, database counter,
User-table update, paid service or Cloudflare configuration was introduced.

### Client compatibility

The existing client request handler recognizes 429 before reading a success body
and passes a dedicated error containing the server's `Retry-After` delay to the
coordinator. Positive integer seconds and standard HTTP dates are supported;
missing, malformed or past values fall back to the existing 30-second cooldown.
A valid delay may be longer or shorter than that generic cooldown.

A rejected synchronization never establishes freshness. Later eligible navigation
waits until the server delay expires; there is no immediate/automatic retry, logout
or redirect. In-flight deduplication, identity-scoped state, public-page access and
the normal five-minute successful-sync freshness interval remain unchanged.

This rate-limit change creates `server/utils/auth0-sync-rate-limit.ts` and
`tests/rate-limit.test.ts`; it updates `server/api/auth/sync.post.ts`,
`nuxt.config.ts`, `.env.example`, `app/middleware/auth0-sync.ts`,
`app/utils/auth0-sync.ts`, `tests/coordinator.test.ts`, `tests/http.integration.ts`,
`tests/browser.integration.ts`, `tests/helpers/production.ts`, and this report.
Prisma schema/migrations/client setup, profile mapping, Auth0 configuration,
Cloudflare headers/rules, dependencies and deployment files are unchanged.

## Eligible-page synchronization

Only the Home Page declares `middleware: ['auth0-sync']`. Future pages can opt in
with the same `definePageMeta` setting. There is no new global route middleware.

The named middleware is inert during SSR. A coordinator is held in a WeakMap per
client Nuxt application. While visiting an eligible page, it subscribes to the
SDK's `useUser()` subject, including while initially undefined. The SDK's existing
client plugin completes its `/auth/profile` request after suspense resolves; that
late user assignment initiates synchronization. The scoped subscription and
navigation hook are removed on departure to a non-eligible page, including
cancelled-entry cleanup. No extra profile initialization requests or permanent
route watchers are introduced.

`auth0: { ssrUser: false }` keeps claims out of SSR HTML/payloads. The SDK still
loads the profile client-side, preserving login/profile/logout UI. Nothing
protects or redirects the public Home Page.

The default freshness interval is 300000 ms, configurable with
`NUXT_PUBLIC_AUTH0_SYNC_FRESHNESS_MS`. Only successful syncs establish freshness.
Initial authenticated/login returns sync; anonymous visits skip; subsequent
eligible navigation within freshness skips. Identity changes reset the current
identity state, even when switching back. Same-identity in-flight calls share a
promise. Late completions for an old identity do not mark a new identity fresh.

Each attempt is one request, with a 10-second timeout and no automatic transport
retry. Failures are swallowed without logout/navigation; a later eligible visit
may retry after a 30-second cooldown, or after `Retry-After` for a 429 response. There are no periodic requests. A new full
page load has a new coordinator and synchronizes again. Client freshness is never
used to authenticate requests or prove a local row exists.

## Origin HTTP caching

Shared Nitro response caching is disabled by the `/**` route rule. There is no
SWR, ISR, cached handler, prerendered personalized page or user-bearing SSR payload.
The build collects an exact allowlist of hash-bearing files from Nuxt/Vite's build
manifest into a server-only virtual module. Extensions or a `/_nuxt/**` prefix
alone do not confer public caching.

The Node-server plugin enforces policy at final header emission because Nitro's
error responses can bypass `beforeResponse`. It changes only cache headers and
preserves session cookies and other response headers. This was tested against the
actual `.output/server/index.mjs` serving path used by the existing Docker image.
It targets the current Node deployment; review the hook if changing Nitro presets.

Dynamic HTML, all APIs by default, SDK/profile routes, errors, payload paths,
unversioned public files and missing assets receive:

```http
Cache-Control: private, no-store, max-age=0
CDN-Cache-Control: no-store
Cloudflare-CDN-Cache-Control: no-store
```

Only allowlisted immutable assets, served successfully through GET/HEAD (or 304)
without Set-Cookie, receive:

```http
Cache-Control: public, max-age=31536000, immutable
CDN-Cache-Control: public, max-age=31536000
Cloudflare-CDN-Cache-Control: public, max-age=31536000
```

Cloudflare configuration is untouched. Configure Dashboard Cache Rules separately:
bypass dynamic/auth/API/payload responses by default, respect private/no-store,
and approve only the verified public hashed asset paths. Do not turn a broad
file-extension rule or `/_nuxt/**` wildcard into a cache-everything exception.
Origin headers cannot override a Dashboard rule that explicitly ignores them.

## Reproducible verification

Node's built-in test runner is used without additional dependencies. Test isolation
is disabled explicitly so individual TypeScript test cases run in this Node 24
environment; unit tests use isolated fixtures and integration commands are separate.

```bash
npx prisma validate
npx prisma generate
npm run typecheck
npm test
npm run build
```

Use a dedicated **loopback PostgreSQL 18** instance for the integration suites.
They reject non-loopback URLs, check the actual server version before writes, and
remove only their own randomized test identities. Never use production credentials.

```bash
export TEST_DATABASE_URL='postgresql://TEST_USER@127.0.0.1:TEST_PORT/TEST_DATABASE'
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:db
npm run test:http
# Requires installed Chrome; optional CHROME_BIN selects its executable.
npm run test:browser
```

Database/HTTP/browser suites explicitly skip when their required test database or
browser is unavailable. A skipped suite is not evidence of a passing integration.
The HTTP/browser suites require the current production build. HTTP sessions are
created with the actual SDK encrypted-cookie store using temporary test secrets;
these tests do not contact a live Auth0 tenant. Browser tests delay the SDK profile
response to exercise initialization/hydration and simulate account switching.

Coverage includes native UUIDv7 version extraction, database defaults and direct-SQL
triggers, unchanged/subject-only updates, identity/createdAt preservation, duplicate
email, concurrent upserts, claim mapping/clearing, freshness/cooldown/deduplication,
late profile loading, subscription cleanup, invalid/expired sessions, forged body
and origin rejection, per-identity rate limits, rejected-write prevention, concurrency,
Retry-After recovery and client cooldowns, API error statuses, responsive layouts, server outages,
private SSR/profile/error/payload responses, real immutable build assets and 304s.

### CI verification

The existing `Production CI/CD` workflow runs the same suites in its `ci` job on
pull requests and pushes to `main`. It installs dependencies, discovers the
runner's Chrome executable, and applies the existing migrations to a disposable
`postgres:18` service. All three database URLs are explicitly set to this loopback
service with test-only credentials. No production Neon or Auth0 secrets are used.
GitHub Actions removes the service when the job ends. See GitHub's
[PostgreSQL service-container documentation](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

The two required verification commands are:

```bash
npm run test:all
npm run check:all
```

`test:all` first requires an isolated `TEST_DATABASE_URL` and an executable Chrome
(`CHROME_BIN`, default `/opt/google/chrome/chrome`), failing if either is missing
instead of allowing integration suites to skip. Docker is also required by the
container suite, which fails rather than skipping when the daemon is unavailable. It generates Prisma Client and
builds the production server with dummy-secret exclusion assertions, then runs unit,
database, HTTP, security, browser and actual Docker-image suites in order. `check:all` validates the Prisma
schema, regenerates the client, checks TypeScript, and builds production again as
the final check. Each command stops on the first failure. The individual suite
commands and their optional-skip behavior remain available for local development.

For local full-suite verification, use a dedicated, disposable PostgreSQL 18
database, set `TEST_DATABASE_URL`, `DATABASE_URL` and `DIRECT_URL` to that same
loopback database, apply migrations as shown above, and set `CHROME_BIN` if needed.
Use dummy Auth0 configuration if a local `.env` is present; fixtures supply their
own temporary session secrets and never perform live Universal Login. The earlier
local OIDC regression fixture remains separate from these repository suites.

Deployment retains `needs: ci`, its push-only condition, and the existing production
commands and secrets. A failed preparation, test, or check prevents deployment.
Browser profile removal uses bounded retries for Chrome subprocess shutdown races.

Local verification of this CI wiring passed `test:all` (45 Node test cases, no
skips), `check:all`, actionlint workflow validation, and the separate local OIDC
regression fixture. Missing database/browser prerequisites and non-loopback test
URLs returned nonzero exits. Hosted GitHub Actions execution remains unverified.

## Executed verification record

On the final rate-limited implementation, these checks passed:

- Prisma v6 schema validation/Client generation were verified during the synchronization baseline; the schema, generated-client setup and migrations are unchanged by rate limiting.
- `npm run typecheck` and `npm run build`.
- `npm test`: 21 individual unit tests, no skips/failures.
- `npm run test:db`: 6 Node test cases, no skips/failures, on PostgreSQL 18.6.
- `npm run test:http`: 12 Node test cases, no skips/failures, against the actual production build.
- `npm run test:browser`: 6 Node test cases, no skips/failures, using installed headless Chrome at 320/390/768/1440px.
- The existing local OIDC fixture also passed login/PKCE, signed callback, encrypted session, profile and logout regression checks after the changes.
- During the synchronization baseline, native `INSERT ... ON CONFLICT` was observed in the isolated PostgreSQL statement log.
- During the synchronization baseline, Prisma migration diff reported no difference between the migrated database and `schema.prisma`.
- Formatting and Git diff whitespace checks.
- Hash comparison confirmed the limiter leaves Prisma schema/migrations/client setup, profile mapping, existing cache-header enforcement, actual `.env`, dependencies/lockfile and deployment files unchanged.
- Deterministic limiter tests cover rolling expiration, precise Retry-After, independent identities, concurrent admission, bounded memory, cleanup and invalid policy. Production HTTP tests additionally verify 429/no-store responses, unchanged database timestamps on rejection, forged-identity resistance, runtime overrides/recovery, failed-attempt accounting and fail-closed configuration. Browser tests verify Retry-After instead of the generic cooldown without logout or redirect.

Earlier HTTP assertions exposed Nitro's error-path header override and were fixed;
final HTTP tests cover that path. Browser account-switch instrumentation was
corrected to use Nuxt's actual prefixed SDK state; final browser tests passed.
There are no remaining failing local checks. Live tenant/CDN/Neon checks below
have not been claimed as passed.

## Independent audit remediation v1.3 (AUD-001 through AUD-004)

The independent audit is preserved at `/tmp/skyinnk-independent-audit/report.md`.
The findings were reproduced before remediation using disposable credentials and
PostgreSQL 18. No production migration, credential rotation, tenant/CDN change,
commit, push, or deployment is part of this remediation.

### AUD-001: native engine and database readiness

Both existing `node:24-bookworm-slim` stages now install `openssl` and
`ca-certificates` before Prisma generation/execution. Node 24, Debian, Prisma 6,
and the existing build/runtime targets remain in place. The liveness endpoint
`GET /api/health` is unchanged. New `GET /api/ready` performs a minimal User-table
read to verify native-engine loading, connectivity, and the migrated schema; it
returns only `{ status: "ready" }`, or a sanitized 503. It inherits private/no-store
headers. The deployment workflow checks readiness inside the running container
after its existing liveness gate; this code was not deployed during remediation.

`tests/containers.integration.ts` builds both real targets, loads their native
engines, starts its own disposable `postgres:18` container, runs the migration
image, and synchronizes an SDK-encrypted session through the production image.
It checks readiness before migration, during a database outage, and after recovery,
while liveness/public HTML stay available. It also verifies the stored UUIDv7 row,
private headers, public immutable assets, expired-session handling, and 413 errors.
The suite uses Linux host networking with randomly selected ports, generated
credentials and uniquely named containers/images; cleanup affects only those test
resources. It never consumes production database URLs. Docker absence fails the
suite rather than skipping it.

### AUD-002: runtime-only credentials and Docker context

All five private Auth0 runtime-config defaults are empty strings. Nuxt's existing
`NUXT_AUTH0_*` runtime overrides remain supported by the SDK. Builds do not read
credential values into compiled defaults. Runtime injection remains mandatory;
real `.env` contents were not changed, printed, replaced, or rotated.

The new `.dockerignore` allows only manifest/configuration, application, server,
public, and Prisma source inputs. Environment files (including nested variants),
local dependencies, build/cache outputs, Git metadata, credentials and unrelated
files stay outside the context. The migration image no longer retains `.env`.

`tests/helpers/build-security.ts` builds with unique dummy client/session-secret
markers and scans all `.output` files for either value. The container suite makes
a disposable context containing dummy root/nested environment files and excluded
sentinels, then scans `/app` in **both** image targets. It also proves runtime
credential injection by starting the built application with independently generated
session credentials. No real environment file enters that disposable context.

### AUD-003: bounded SDK backchannel bodies

`server/middleware/backchannel-body-limit.ts` enforces **16 KiB of incoming bytes**
on the SDK's POST backchannel route. Oversize Content-Length is rejected before
reading; chunked bodies are counted while iterating the Node request, and rejected
as soon as the limit is crossed. A 413 closes that connection instead of keeping
an unread request reusable. There are no custom data-event listeners or patched
SDK/parser code: Node 24's `iterator({ destroyOnReturn: false })` allows an early
response without destroying its socket first. Accepted bounded bytes are passed
through h3's pre-read body input, including an empty byte array for empty chunked
requests. The SDK still parses the protocol and verifies the logout token.

Regressions cover exact-limit bodies, ordinary/empty chunked bodies, and early
413 responses for both framing types while the sender deliberately leaves the
body unfinished. Case/trailing-slash route variants receive the same protection.
The signed local OIDC fixture additionally supplies valid and forged logout JWTs:
a valid token reaches the existing stateless-store limitation, while a forged
signature is rejected before that step. Stateless backchannel revocation remains
unsupported by the existing SDK store; no session-storage redesign was introduced.

### AUD-004: genuine encrypted-envelope expiration

`server/middleware/auth0-session-expiry.ts` decorates only `getSession` and
`getUser` on the SDK's request-scoped client. The existing SDK routes, claims
verification, cookie encryption and login/callback/logout implementations remain
in use. `readWithSessionExpiry` catches only an actual JOSE `JWTExpired` instance
for the `exp` claim; configuration errors, other validation failures, and lookalike
objects propagate. Expired session cookie chunks are cleared with their configured
path and cookie security options. Sync returns 401; profile returns the SDK's normal
anonymous 204 response. Cache policy remains private/no-store.

The fixture creates authenticated encrypted cookies with envelope `exp` sixty
seconds in the past, beyond the SDK's fifteen-second tolerance, without mocking
the global clock. Tests check multi-chunk removal and valid-session behavior.
Unit tests prove unrelated exceptions retain their identity and do not clear cookies.
The repository now contains a local HTTPS OIDC provider regression using generated
keys/certificates: authorization-code/PKCE exchange, signed callback, safe return URL,
session-cookie attributes, profile, sync, logout and tampered cookies are exercised
without live Auth0 access or disabled TLS verification.

### Verification and regression controls

`npm run test:all` now requires loopback `TEST_DATABASE_URL`, executable Chrome,
OpenSSL, and a working Docker daemon. `CHROME_BIN` and optional `DOCKER_BIN` select
executables; ordinary Docker configuration such as `DOCKER_HOST` is honored. It
runs the dummy-secret build, unit/database/HTTP/security/OIDC/browser tests and
actual container suite. `npm run check:all` still validates/generates Prisma,
checks TypeScript, and builds production. CI uses only its existing disposable
PostgreSQL credentials, includes all new suites, and allows 25 minutes for image
builds. Container fixtures generate their own PostgreSQL credentials independently.

Final verification on 4 November 2026 passed:

- `npm run test:all`: **59 reported cases, no failures/skips**, including five
  parent cases (54 leaf cases): unit 22, database 6, HTTP 12, security 6, signed
  OIDC 1, browser 6, actual Docker images 6.
- `npm run check:all`: Prisma validation/generation, TypeScript and production
  build all passed. The dummy-secret build assertion also passed.
- Both actual Docker targets loaded their native engines and passed artifact
  scans; the migration/runtime test used PostgreSQL **18.6**. The container base
  ran Node **24.22.2** on Linux amd64. The temporary verification daemon was
  rootless Docker 28.5.1 with overlay2 storage; no host container service was used.
- `actionlint` 1.7.12, Prettier checks on changed supported files, and
  `git diff --check` passed. Existing `.env`, `.env.example`, lockfile, Prisma
  schema/migrations/singleton and frontend source hashes remained unchanged.

Logs and mutation-control evidence are recorded in `/tmp/skyinnk-remediation/`.
Mutation experiments operate on disposable source copies, preserving the saved
checkout: restoring build-time secret serialization fails the artifact scan;
removing Docker-context exclusions fails the real-image scan; removing the
expiry/body-limit middleware fails the corresponding HTTP tests. Loading the
engine in the original unmodified Docker base fails with `ERR_DLOPEN_FAILED`,
while both corrected images load it. Initial temporary-daemon storage exhaustion,
a test-status assumption and a nested-test fixture mistake were corrected before
the final full runs; none is counted as a passing check.

Hosted GitHub Actions, other CPU architectures, live Auth0/Neon/CDN and VPS
configuration remain outside local verification. Production release still requires
the external prerequisites below. Existing SDK stateless storage continues to
reject backchannel revocation after valid token verification; this fix bounds its
requests and preserves that behavior rather than changing session architecture.

Changed implementation/verification files:

| Files                                                                         | Purpose                                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `Dockerfile`, `.dockerignore`, `nuxt.config.ts`                               | Native dependencies, safe build context, runtime-only credentials.    |
| `server/api/ready.get.ts`                                                     | Database/schema readiness, separate from liveness.                    |
| `server/middleware/backchannel-body-limit.ts`                                 | Bounded pre-read body for the existing SDK route.                     |
| `server/middleware/auth0-session-expiry.ts`, `server/utils/session-expiry.ts` | Narrow request-scoped expiry normalization.                           |
| `tests/helpers/production.ts`                                                 | Reusable authentic session cookies and true envelope-expiry fixtures. |
| `tests/helpers/build-security.ts`, `tests/helpers/require-integration.ts`     | Secret-marker build and mandatory tool checks.                        |
| `tests/security.integration.ts`, `tests/session-expiry.test.ts`               | HTTP boundaries and exception-preservation regressions.               |
| `tests/oidc.integration.ts`, `tests/containers.integration.ts`                | Signed local OIDC and actual image/database verification.             |
| `package.json`, `.github/workflows/deploy-production.yml`                     | Full-suite integration and deployment readiness gate.                 |
| `docs/auth0-user-sync.md`                                                     | Current behavior, evidence and production prerequisites.              |

## Before production approval

The migration was applied only to an isolated local PostgreSQL 18.6 database during
implementation. The configured Neon endpoint could not be reached for the read-only
version check; its actual server version and migration history remain unverified.

Before applying anything to Neon, use its SQL editor/read-only connection to check:

```sql
SELECT current_setting('server_version_num')::integer;
SELECT uuid_extract_version(uuidv7());
SELECT to_regclass('public."User"'), to_regclass('public._prisma_migrations');
```

Require PostgreSQL >=18 and UUID version 7. Inspect existing tables/migration
history, review this additive migration and the trigger/function names, and test
on an isolated Neon branch if its environment differs from local PostgreSQL.
Do not reset an existing database or invent a baseline if existing objects differ.
Only after explicit production approval run the established migration/deployment
workflow. No production migration, deployment, commit, push or Cloudflare change
was performed here.

Keep existing `DATABASE_URL`, `DIRECT_URL`, and five `NUXT_AUTH0_*` settings;
`NUXT_AUTH0_APP_BASE_URL` must exactly match the browser's public origin for CSRF.
The existing Auth0 callback/logout Dashboard URLs remain valid. No additional
Auth0 credentials, API audiences or scopes are required. Live tenant login/signup,
logout and final CDN behavior still require an environment smoke test after
Dashboard setup and deployment approval.

References: [Auth0 Nuxt SDK](https://github.com/auth0/auth0-nuxt/blob/main/packages/auth0-nuxt/README.md),
[Prisma v6 upserts](https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference#upsert),
[PostgreSQL 18 UUIDs](https://www.postgresql.org/docs/18/functions-uuid.html),
[OIDC standard claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims),
[HTTP Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after).
