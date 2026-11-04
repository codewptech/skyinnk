import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  startProductionServer,
  isolatedDatabaseUrl,
} from "./helpers/production.ts";

function privateHeaders(response: Response) {
  assert.equal(
    response.headers.get("cache-control"),
    "private, no-store, max-age=0",
  );
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(
    response.headers.get("cloudflare-cdn-cache-control"),
    "no-store",
  );
}

test(
  "production HTTP authentication, CSRF, synchronization and cache policies",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const db = new PrismaClient({ datasourceUrl: isolatedDatabaseUrl() });
    const [version] = await db.$queryRaw<
      { version: number }[]
    >`SELECT current_setting('server_version_num')::int AS version`;
    assert.ok(version!.version >= 180000);
    const server = await startProductionServer();
    const subject = `http-test|${randomUUID()}`;
    const cookie = await server.cookie({
      sub: subject,
      name: "Session-owned name",
      email: "http-test@example.invalid",
    });
    const headers = {
      Origin: server.origin,
      "X-Auth0-Sync": "1",
      Cookie: cookie,
    };
    const call = (path: string, init?: RequestInit) =>
      fetch(server.origin + path, { redirect: "manual", ...init });
    try {
      await t.test(
        "POST session authentication and request security",
        async () => {
          for (const bad of [
            { ...headers, Origin: "https://attacker.example.invalid" },
            { ...headers, Origin: "null" },
            { ...headers, Origin: "" },
            { ...headers, "X-Auth0-Sync": "" },
            { ...headers, "Sec-Fetch-Site": "cross-site" },
          ]) {
            const response = await call("/api/auth/sync", {
              method: "POST",
              headers: bad,
            });
            assert.equal(response.status, 403);
            privateHeaders(response);
          }
          const forged = await call("/api/auth/sync", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              sub: "forged",
              email: "forged@example.invalid",
            }),
          });
          assert.equal(forged.status, 403);
          privateHeaders(forged);
          for (const Cookie of [
            "",
            "__a0_session.0=tampered",
            await server.cookie({ sub: subject }, true),
            await server.cookie({ name: "No subject" } as never),
          ]) {
            const response = await call("/api/auth/sync", {
              method: "POST",
              headers: { ...headers, Cookie },
            });
            assert.equal(response.status, 401);
            privateHeaders(response);
          }
          const get = await call("/api/auth/sync", { headers });
          assert.notEqual(get.status, 200);
          privateHeaders(get);
          assert.equal(await db.user.count({ where: { auth0Id: subject } }), 0);
        },
      );
      await t.test(
        "server session exclusively supplies identity; API returns minimal JSON",
        async () => {
          let response = await call("/api/auth/sync?sub=forged", {
            method: "POST",
            headers,
          });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), { synced: true });
          privateHeaders(response);
          const before = await db.user.findUniqueOrThrow({
            where: { auth0Id: subject },
          });
          assert.equal(before.name, "Session-owned name");
          response = await call("/api/auth/sync", {
            method: "POST",
            headers: {
              ...headers,
              Cookie: await server.cookie({
                sub: subject,
                name: "Updated session",
              }),
            },
          });
          assert.equal(response.status, 200);
          const after = await db.user.findUniqueOrThrow({
            where: { auth0Id: subject },
          });
          assert.equal(after.name, "Updated session");
          assert.equal(after.id, before.id);
          assert.ok(after.updatedAt > before.updatedAt);
          assert.equal(
            await db.user.count({ where: { auth0Id: "forged" } }),
            0,
          );
        },
      );
      await t.test(
        "verified identities get ten requests; 429 preserves data, Retry-After and private headers",
        async () => {
          const sub = `${subject}-limited`;
          const Cookie = await server.cookie({
            sub,
            email: "same-limit@example.invalid",
          });
          const limitedHeaders = { ...headers, Cookie };
          const firstBefore = performance.now();
          assert.equal(
            (
              await call("/api/auth/sync", {
                method: "POST",
                headers: limitedHeaders,
              })
            ).status,
            200,
          );
          const firstAfter = performance.now();
          for (let i = 1; i < 10; i++)
            assert.equal(
              (
                await call("/api/auth/sync", {
                  method: "POST",
                  headers: limitedHeaders,
                })
              ).status,
              200,
            );
          const before = await db.user.findUniqueOrThrow({
            where: { auth0Id: sub },
          });
          const deniedBefore = performance.now();
          const denied = await call("/api/auth/sync", {
            method: "POST",
            headers: limitedHeaders,
          });
          const deniedAfter = performance.now();
          assert.equal(denied.status, 429);
          privateHeaders(denied);
          const retry = Number(denied.headers.get("retry-after"));
          assert.ok(Number.isInteger(retry));
          assert.ok(
            retry >=
              Math.max(
                1,
                Math.ceil((firstBefore + 60_000 - deniedAfter) / 1000),
              ),
          );
          assert.ok(
            retry <=
              Math.max(
                1,
                Math.ceil((firstAfter + 60_000 - deniedBefore) / 1000),
              ),
          );
          const error = await denied.json();
          assert.equal(error.statusCode, 429);
          assert.equal(error.statusMessage, "Too Many Requests");
          assert.ok(!JSON.stringify(error).includes(sub));
          assert.ok(
            !JSON.stringify(error).includes("same-limit@example.invalid"),
          );
          const rotatedCookie = await server.cookie({
            sub,
            name: "New session, same identity",
          });
          assert.equal(
            (
              await call("/api/auth/sync?sub=forged&userId=another", {
                method: "POST",
                headers: {
                  ...limitedHeaders,
                  Cookie: rotatedCookie,
                  "X-Forwarded-For": "192.0.2.123",
                },
              })
            ).status,
            429,
          );
          const csrf = await call("/api/auth/sync", {
            method: "POST",
            headers: {
              ...limitedHeaders,
              Origin: "https://untrusted.example.invalid",
            },
          });
          assert.equal(csrf.status, 403);
          assert.equal(csrf.headers.get("retry-after"), null);
          for (const Cookie of [
            "",
            "__a0_session.0=tampered",
            await server.cookie({ sub }, true),
          ]) {
            const unauthorized = await call("/api/auth/sync", {
              method: "POST",
              headers: { ...limitedHeaders, Cookie },
            });
            assert.equal(unauthorized.status, 401);
            assert.equal(unauthorized.headers.get("retry-after"), null);
          }
          const after = await db.user.findUniqueOrThrow({
            where: { auth0Id: sub },
          });
          assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
          assert.equal(after.id, before.id);
          const other = await call("/api/auth/sync", {
            method: "POST",
            headers: {
              ...headers,
              Cookie: await server.cookie({
                sub: `${subject}-other`,
                email: "same-limit@example.invalid",
              }),
            },
          });
          assert.equal(other.status, 200);
          assert.equal(
            await db.user.count({
              where: {
                auth0Id: { in: [sub, `${subject}-other`] },
                email: "same-limit@example.invalid",
              },
            }),
            2,
          );
          const html = await (await call("/")).text();
          assert.ok(!html.includes("auth0SyncRateLimit"));
        },
      );
      await t.test(
        "concurrent production requests admit exactly ten before Prisma",
        async () => {
          const sub = `${subject}-parallel`;
          const Cookie = await server.cookie({ sub });
          const responses = await Promise.all(
            Array.from({ length: 25 }, () =>
              call("/api/auth/sync", {
                method: "POST",
                headers: { ...headers, Cookie },
              }),
            ),
          );
          assert.equal(
            responses.filter((response) => response.status === 200).length,
            10,
          );
          assert.equal(
            responses.filter((response) => response.status === 429).length,
            15,
          );
          for (const response of responses) {
            privateHeaders(response);
            if (response.status === 429)
              assert.ok(Number(response.headers.get("retry-after")) > 0);
          }
          assert.equal(await db.user.count({ where: { auth0Id: sub } }), 1);
        },
      );
      await t.test(
        "private runtime configuration changes allowance/window and the limiter recovers",
        async () => {
          const sub = `${subject}-configured`;
          const configured = await startProductionServer(
            isolatedDatabaseUrl(),
            {
              NUXT_AUTH0_SYNC_RATE_LIMIT_MAX_REQUESTS: "2",
              NUXT_AUTH0_SYNC_RATE_LIMIT_WINDOW_MS: "2000",
            },
          );
          try {
            const init = {
              method: "POST",
              headers: {
                Origin: configured.origin,
                "X-Auth0-Sync": "1",
                Cookie: await configured.cookie({ sub }),
              },
            };
            for (let i = 0; i < 2; i++)
              assert.equal(
                (await fetch(configured.origin + "/api/auth/sync", init))
                  .status,
                200,
              );
            const denied = await fetch(
              configured.origin + "/api/auth/sync",
              init,
            );
            assert.equal(denied.status, 429);
            privateHeaders(denied);
            const delay = Number(denied.headers.get("retry-after"));
            assert.ok(delay >= 1 && delay <= 2);
            await new Promise((resolve) =>
              setTimeout(resolve, delay * 1000 + 30),
            );
            assert.equal(
              (await fetch(configured.origin + "/api/auth/sync", init)).status,
              200,
            );
          } finally {
            await configured.stop();
          }
        },
      );
      await t.test(
        "failed database attempts consume quota; rejected requests do not reach unavailable Prisma",
        async () => {
          const unavailable = await startProductionServer(
            "postgresql://test@127.0.0.1:1/unavailable?connect_timeout=1",
            {
              NUXT_AUTH0_SYNC_RATE_LIMIT_MAX_REQUESTS: "2",
              NUXT_AUTH0_SYNC_RATE_LIMIT_WINDOW_MS: "60000",
            },
          );
          try {
            const init = {
              method: "POST",
              headers: {
                Origin: unavailable.origin,
                "X-Auth0-Sync": "1",
                Cookie: await unavailable.cookie({
                  sub: `${subject}-unavailable`,
                }),
              },
            };
            for (let i = 0; i < 2; i++)
              assert.equal(
                (await fetch(unavailable.origin + "/api/auth/sync", init))
                  .status,
                503,
              );
            const denied = await fetch(
              unavailable.origin + "/api/auth/sync",
              init,
            );
            assert.equal(denied.status, 429);
            privateHeaders(denied);
            assert.ok(Number(denied.headers.get("retry-after")) > 0);
          } finally {
            await unavailable.stop();
          }
        },
      );
      await t.test(
        "invalid runtime rate policy fails closed without a user write",
        async () => {
          const sub = `${subject}-invalid-policy`;
          const configured = await startProductionServer(
            isolatedDatabaseUrl(),
            { NUXT_AUTH0_SYNC_RATE_LIMIT_MAX_REQUESTS: "0" },
          );
          try {
            const response = await fetch(configured.origin + "/api/auth/sync", {
              method: "POST",
              headers: {
                Origin: configured.origin,
                "X-Auth0-Sync": "1",
                Cookie: await configured.cookie({ sub }),
              },
            });
            assert.equal(response.status, 503);
            privateHeaders(response);
            assert.equal(await db.user.count({ where: { auth0Id: sub } }), 0);
          } finally {
            await configured.stop();
          }
        },
      );
      await t.test(
        "private HTML, APIs, Auth0 callbacks/profile, errors and payload paths",
        async () => {
          for (const path of [
            "/",
            "/api/health",
            "/auth/profile",
            "/auth/callback?code=untrusted",
            "/_payload.json",
            "/_nuxt/builds/latest.json",
            "/not-found",
            "/robots.txt",
            "/favicon.ico",
          ]) {
            const response = await call(path, { headers: { Cookie: cookie } });
            privateHeaders(response);
            if (path === "/") {
              const html = await response.text();
              assert.match(html, /Coming Soon/);
              assert.ok(!html.includes("Session-owned name"));
              assert.ok(!html.includes(subject));
            }
            if (path === "/auth/profile") {
              assert.equal((await response.json()).sub, subject);
              assert.match(response.headers.get("vary")!, /Cookie/);
            }
          }
          const anonymous = await call("/");
          privateHeaders(anonymous);
          assert.ok(!(await anonymous.text()).includes(subject));
        },
      );
      await t.test(
        "real build assets are immutable; missing assets and unversioned files stay private",
        async () => {
          const html = await (await call("/")).text();
          const paths = [
            ...new Set(
              [
                ...html.matchAll(
                  /(?:src|href)="([^"?#]*\/_nuxt\/[^"?#]+\.(?:js|css))"/g,
                ),
              ].map((m) => m[1]!),
            ),
          ];
          assert.ok(paths.length > 0);
          for (const path of paths) {
            const response = await call(path);
            assert.equal(response.status, 200);
            assert.equal(
              response.headers.get("cache-control"),
              "public, max-age=31536000, immutable",
            );
            assert.equal(
              response.headers.get("cdn-cache-control"),
              "public, max-age=31536000",
            );
            const etag = response.headers.get("etag");
            if (etag) {
              const cached = await call(path, {
                headers: { "If-None-Match": etag },
              });
              assert.equal(cached.status, 304);
              assert.equal(
                cached.headers.get("cache-control"),
                "public, max-age=31536000, immutable",
              );
            }
          }
          privateHeaders(await call("/_nuxt/missing123.js"));
        },
      );
      await t.test("unexpected schema failure is a sanitized 500", async () => {
        const url = new URL(isolatedDatabaseUrl());
        url.searchParams.set("schema", "missing_test_schema");
        const missing = await startProductionServer(url.href);
        try {
          const response = await fetch(missing.origin + "/api/auth/sync", {
            method: "POST",
            headers: {
              Origin: missing.origin,
              "X-Auth0-Sync": "1",
              Cookie: await missing.cookie({ sub: subject }),
            },
          });
          assert.equal(response.status, 500);
          privateHeaders(response);
          const text = await response.text();
          assert.ok(!text.includes("Prisma"));
          assert.ok(!text.includes("missing_test_schema"));
        } finally {
          await missing.stop();
        }
      });
      await t.test(
        "temporary database failure returns 503 while public HTML remains available",
        async () => {
          const unavailable = await startProductionServer(
            "postgresql://test@127.0.0.1:1/unavailable?connect_timeout=1",
          );
          try {
            const response = await fetch(
              unavailable.origin + "/api/auth/sync",
              {
                method: "POST",
                headers: {
                  Origin: unavailable.origin,
                  "X-Auth0-Sync": "1",
                  Cookie: await unavailable.cookie({ sub: subject }),
                },
              },
            );
            assert.equal(response.status, 503);
            privateHeaders(response);
            const page = await fetch(unavailable.origin + "/");
            assert.equal(page.status, 200);
            privateHeaders(page);
          } finally {
            await unavailable.stop();
          }
        },
      );
    } finally {
      await server.stop();
      await db.user.deleteMany({ where: { auth0Id: { startsWith: subject } } });
      await db.$disconnect();
    }
  },
);
