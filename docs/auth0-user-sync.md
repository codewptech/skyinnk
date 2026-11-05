# Auth0 user synchronization

Current lightweight validation and its limits are documented in
[testing.md](testing.md). Production database and authentication behavior below
are unchanged by the testing rewrite.

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
| `package.json`                                                     | Two lightweight validation commands, with no new dependency.                                   |
| `README.md`                                                        | Link to this implementation and review guide.                                                  |
| `docs/auth0-user-sync.md`                                          | Model, policy, per-file report, test commands and manual prerequisites.                        |

Existing dependency/lockfile changes from the earlier Auth0 integration are
preserved. The v1.2 synchronization baseline installed no packages and preserved Docker/Compose.
The production native-engine, secret, request-size, and expiry protections remain
in place. Cloudflare configuration and production credentials are unchanged.

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

The lightweight core and HTTP suites cover client policy and API admission with
isolated persistence/session doubles. They do not establish distributed quotas
or actual database concurrency.

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

```bash
npm run check:all
npm run test:all
```

`check:all` supplies unreachable validation URLs and dummy Auth0 credentials,
validates the schema and generates Prisma Client once, checks Nuxt types, builds
once, and scans generated artifacts for those dummy secret markers. It neither
connects to a database nor applies migrations. Prisma CLI and Client remain
6.19.3.

`test:all` runs the general core, HTTP/security, and rendering categories without
production output, generated Prisma Client, database URLs, a browser, Docker, or
network services. Persistence and verified Auth0 sessions are explicit doubles.
Actual mapping, admission, error normalization, limiter, middleware, and Vue
rendering logic execute. See [testing.md](testing.md) for the exact boundaries.

CI installs once and runs those two commands in order. It has no database service,
Chrome discovery, migrations, image builds, or integration prerequisites. The
existing production deploy job remains CI-gated, push-only, and otherwise
unchanged, including its real Prisma migrations and liveness/readiness checks.

## Runtime protections

The production Docker targets retain OpenSSL/CA certificates for Prisma's native
engine. `/api/health` is public process liveness; `/api/ready` performs a minimal
User read and sanitizes engine/database/schema failures to 503. The deployment
checks readiness after startup.

Private Auth0 defaults remain empty in Nuxt configuration and are overridden at
runtime. The production Docker context exclusions remain unchanged. Build checks
scan server/public artifacts for injected secret markers, but do not inspect real
image assembly.

The backchannel middleware caps declared and streamed bodies at 16 KiB before SDK
parsing. Only a genuine JOSE expiration of the `exp` claim becomes anonymous and
clears matching cookie chunks; unrelated validation/configuration errors still
propagate. Lightweight tests exercise these middleware decisions with isolated
streams and session clients, not signed OIDC exchange or real HTTP sockets.

The rewrite intentionally removes automatic PostgreSQL migration/default/trigger
verification, signed OIDC/TLS flows, encrypted-cookie browser round trips, image
packaging/native-engine checks, outage recovery, and browser hydration/layout
coverage. Mocks and rendering checks do not provide equivalent integration
assurance. These are explicit limits of the new lightweight CI contract.

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
