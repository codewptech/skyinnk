import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
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
  "audit regressions on the production server",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const server = await startProductionServer(isolatedDatabaseUrl(), {
      // Token rejection must not depend on external DNS/network availability.
      NUXT_AUTH0_DOMAIN: "127.0.0.1:1",
    });
    try {
      await t.test(
        "expired encrypted envelopes are anonymous and every unusable cookie chunk is cleared",
        async () => {
          // Multiple chunks protect against clearing only .0. This stays within Node's header limit.
          const Cookie = await server.cookie(
            { sub: "security|expired", name: "x".repeat(5000) },
            "envelope",
          );
          const names = Cookie.split("; ").map((pair) => pair.split("=")[0]!);
          assert.ok(names.length > 1);
          for (const path of ["/api/auth/sync", "/auth/profile"]) {
            const response = await fetch(server.origin + path, {
              method: path.endsWith("sync") ? "POST" : "GET",
              headers: { Cookie, Origin: server.origin, "X-Auth0-Sync": "1" },
            });
            assert.equal(response.status, path.endsWith("sync") ? 401 : 204);
            if (path.endsWith("profile"))
              assert.equal(await response.text(), "");
            privateHeaders(response);
            const cleared = response.headers.getSetCookie();
            for (const name of names)
              assert.ok(
                cleared.some(
                  (line) =>
                    line.startsWith(`${name}=`) && /Max-Age=0/i.test(line),
                ),
              );
          }
          const valid = await fetch(server.origin + "/auth/profile", {
            headers: { Cookie: await server.cookie({ sub: "security|valid" }) },
          });
          assert.equal((await valid.json()).sub, "security|valid");
        },
      );

      await t.test(
        "backchannel protocol-sized requests still reach the SDK",
        async () => {
          for (const [contentType, body] of [
            ["application/x-www-form-urlencoded", "logout_token=not-a-jwt"],
            ["application/json", JSON.stringify({ logout_token: "not-a-jwt" })],
            [
              "application/json",
              JSON.stringify({ padding: "x".repeat(16 * 1024 - 14) }),
            ],
          ]) {
            assert.ok(Buffer.byteLength(body!) <= 16 * 1024);
            const response = await fetch(
              server.origin + "/auth/backchannel-logout",
              {
                method: "POST",
                headers: {
                  "Content-Type": contentType!,
                  Accept: "application/json",
                },
                body,
              },
            );

            assert.equal(response.status, 400); // SDK verification/missing token, never accepted or replaced by a limit error.
            privateHeaders(response);
          }
        },
      );

      await t.test(
        "empty and ordinary chunked requests remain readable by the SDK",
        async () => {
          for (const body of ["", "logout_token=not-a-jwt"]) {
            await new Promise<void>((resolve, reject) => {
              const req = request(
                server.origin + "/auth/backchannel-logout",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Transfer-Encoding": "chunked",
                    Accept: "application/json",
                  },
                },
                (response) => {
                  assert.equal(response.statusCode, 400);
                  response.resume();
                  response.once("end", resolve);
                },
              );
              req.on("error", reject);
              req.setTimeout(3000, () => {
                req.destroy();
                reject(new Error("Chunked body was consumed twice"));
              });
              req.end(body);
            });
          }
        },
      );

      await t.test(
        "oversize declarations and unfinished chunked bodies get early 413",
        async () => {
          for (const path of [
            "/auth/backchannel-logout",
            "/AUTH/backchannel-logout",
            "/auth/backchannel-logout/?probe=1",
          ]) {
            for (const chunked of [false, true]) {
              await new Promise<void>((resolve, reject) => {
                const req = request(
                  server.origin + path,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                      ...(chunked ? {} : { "Content-Length": "100000000" }),
                    },
                  },
                  (response) => {
                    try {
                      assert.equal(response.statusCode, 413);
                      assert.equal(
                        response.headers["cache-control"],
                        "private, no-store, max-age=0",
                      );
                      assert.equal(
                        response.headers["cdn-cache-control"],
                        "no-store",
                      );
                      assert.equal(
                        response.headers["cloudflare-cdn-cache-control"],
                        "no-store",
                      );
                      response.resume();
                      response.once("end", () => {
                        req.destroy();
                        resolve();
                      });
                    } catch (error) {
                      req.destroy();
                      reject(error);
                    }
                  },
                );
                req.on("error", reject);
                req.setTimeout(3000, () => {
                  req.destroy();
                  reject(
                    new Error(
                      "Server waited for the rest of the oversized body",
                    ),
                  );
                });
                // Deliberately never end: a successful test proves rejection before full buffering.
                if (chunked) req.write("x".repeat(16 * 1024 + 1));
                else req.flushHeaders();
              });
            }
          }
        },
      );

      await t.test(
        "readiness checks native engine and migrated schema; liveness survives outages",
        async () => {
          const ready = await fetch(server.origin + "/api/ready");
          assert.equal(ready.status, 200);
          assert.deepEqual(await ready.json(), { status: "ready" });
          privateHeaders(ready);
          const url = new URL(isolatedDatabaseUrl());
          url.searchParams.set("schema", "missing_readiness_schema");
          for (const database of [
            url.href,
            "postgresql://test@127.0.0.1:1/missing?connect_timeout=1",
          ]) {
            const unavailable = await startProductionServer(database);
            try {
              const response = await fetch(unavailable.origin + "/api/ready");
              assert.equal(response.status, 503);
              privateHeaders(response);
              const text = await response.text();
              assert.ok(
                !text.includes("Prisma") && !text.includes("postgresql://"),
              );
              assert.equal(
                (await fetch(unavailable.origin + "/api/health")).status,
                200,
              );
              assert.equal((await fetch(unavailable.origin + "/")).status, 200);
            } finally {
              await unavailable.stop();
            }
          }
        },
      );
    } finally {
      await server.stop();
    }
  },
);
