import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { Readable } from "node:stream";
import { ServerResponse } from "node:http";
import {
  createApp,
  createRouter,
  createEvent,
  createError,
  defineEventHandler,
  toWebHandler,
} from "h3";
import { errors } from "jose";
import {
  database,
  ConnectionError,
  RequestError,
  resetDatabase,
} from "./support.mjs";
import { createAuth0SyncRateLimiter } from "../server/utils/auth0-sync-rate-limit.ts";

// Supply Nuxt's runtime injection points, not its authentication implementation.
Object.assign(globalThis, {
  defineEventHandler,
  createError,
  defineNitroPlugin: (setup) => setup,
  useRuntimeConfig: (event) => event.context.config,
  useAuth0: (event) => event.context.auth0Client,
});
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "#immutable-build-assets")
      return {
        url: 'data:text/javascript,export default ["/_nuxt/app.12345678.js"]',
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const health = (await import("../server/api/health.get.ts")).default;
const ready = (await import("../server/api/ready.get.ts")).default;
const bodyLimit = (
  await import("../server/middleware/backchannel-body-limit.ts")
).default;
const sessionExpiry = (
  await import("../server/middleware/auth0-session-expiry.ts")
).default;
const cachePolicy = (await import("../server/plugins/cache-headers.ts"))
  .default;
beforeEach(resetDatabase);

let fixtureId = 0;
async function api() {
  // Each fixture gets a fresh process-local limiter; no global clock mutation.
  const sync = (
    await import(`../server/api/auth/sync.post.ts?fixture=${++fixtureId}`)
  ).default;
  const app = createApp({ debug: false });
  app.use(
    createRouter()
      .get("/api/health", health)
      .get("/api/ready", ready)
      .post("/api/auth/sync", sync),
  );
  const handle = toWebHandler(app);
  return async (
    path = "/api/auth/sync",
    init = {},
    user = { sub: "session|owner" },
  ) => {
    const request = new Request(`https://skyinnk.test${path}`, {
      method: "POST",
      ...init,
      headers: {
        Origin: "https://skyinnk.test",
        "X-Auth0-Sync": "1",
        ...init.headers,
      },
    });
    return handle(request, {
      config: {
        auth0: { appBaseUrl: "https://skyinnk.test" },
        auth0SyncRateLimit: { maxRequests: 2, windowMs: 60000 },
      },
      auth0Client: {
        getSession: async () => (user === undefined ? undefined : { user }),
      },
    });
  };
}

test("HTTP rejects invalid origins, missing CSRF, cross-site requests and framed bodies before writes", async () => {
  const request = await api();
  for (const headers of [
    { Origin: "https://attacker.invalid" },
    { Origin: "null" },
    { Origin: "" },
    { "X-Auth0-Sync": "" },
    { "X-Auth0-Sync": "invalid" },
    { "Sec-Fetch-Site": "cross-site" },
    { "Content-Length": "1" },
    { "Transfer-Encoding": "chunked" },
  ]) {
    const response = await request(undefined, { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).statusCode, 403);
  }
  assert.equal(database.user.upsert.mock.callCount(), 0);
  assert.equal((await request(undefined, { method: "GET" })).status, 404);
  assert.equal(database.user.upsert.mock.callCount(), 0);
});

test("HTTP rejects absent or unusable verified identities and never writes", async () => {
  const request = await api();
  for (const user of [null, {}, { sub: "" }, { sub: "bad\0subject" }]) {
    const response = await request(undefined, {}, user);
    assert.equal(response.status, 401);
    assert.equal(
      (await response.json()).statusMessage,
      "Authentication required",
    );
  }
  assert.equal(database.user.upsert.mock.callCount(), 0);
});

test("HTTP accepts verified-session claims, ignores query identity and returns minimal success JSON", async () => {
  const request = await api();
  const response = await request(
    "/api/auth/sync?sub=forged",
    {},
    { sub: "session|actual", name: "Actual", access_token: "private" },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { synced: true });
  const [write] = database.user.upsert.mock.calls[0].arguments;
  assert.deepEqual(write.create, { auth0Id: "session|actual", name: "Actual" });
});

test("HTTP rate limits verified identities before persistence and returns Retry-After", async () => {
  const request = await api();
  const responses = await Promise.all(
    Array.from({ length: 7 }, () => request()),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 2);
  const denied = responses.filter((r) => r.status === 429);
  assert.equal(denied.length, 5);
  for (const response of denied)
    assert.ok(Number(response.headers.get("retry-after")) >= 1);
  assert.equal(database.user.upsert.mock.callCount(), 2);
  assert.equal(
    (await request(undefined, {}, { sub: "another|identity" })).status,
    200,
  );
});

test("HTTP persistence failures return sanitized 503 or 500 without leaking private details", async () => {
  const request = await api();
  for (const [error, status] of [
    [new ConnectionError("private-connection-marker"), 503],
    [new RequestError("P1001"), 503],
    [new Error("private-query-marker"), 500],
  ]) {
    database.user.upsert.mock.mockImplementation(async () => {
      throw error;
    });
    const response = await request(
      undefined,
      {},
      { sub: `owner|${status}|${error.name}` },
    );
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(
      body.statusMessage,
      status === 503
        ? "Synchronization temporarily unavailable"
        : "Synchronization failed",
    );
    assert.ok(!JSON.stringify(body).includes("private-"));
  }
});

test("liveness is independent of persistence; readiness reports sanitized availability", async () => {
  const request = await api();
  assert.deepEqual(
    await (await request("/api/ready", { method: "GET" })).json(),
    { status: "ready" },
  );
  database.user.findFirst.mock.mockImplementation(async () => {
    throw new Error("private-database-marker");
  });
  const unavailable = await request("/api/ready", { method: "GET" });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).statusMessage, "Database not ready");
  assert.deepEqual(
    await (await request("/api/health", { method: "GET" })).json(),
    { status: "ok" },
  );
});

function nodeEvent(path, method = "GET", chunks = [], headers = {}) {
  const request = Object.assign(Readable.from(chunks), {
    url: path,
    method,
    headers: { host: "skyinnk.test", ...headers },
  });
  return createEvent(request, new ServerResponse(request));
}

test("response policy keeps dynamic/error/cookie responses private and only approved assets immutable", () => {
  let applyPolicy;
  cachePolicy({
    hooks: {
      hook: (name, callback) => {
        assert.equal(name, "request");
        applyPolicy = callback;
      },
    },
  });
  for (const [path, method, status, cookie, expected] of [
    ["/", "GET", 200, false, "private, no-store, max-age=0"],
    ["/auth/profile", "GET", 200, true, "private, no-store, max-age=0"],
    ["/_nuxt/missing.js", "GET", 404, false, "private, no-store, max-age=0"],
    [
      "/_nuxt/app.12345678.js",
      "GET",
      200,
      false,
      "public, max-age=31536000, immutable",
    ],
    [
      "/_nuxt/app.12345678.js",
      "HEAD",
      304,
      false,
      "public, max-age=31536000, immutable",
    ],
    [
      "/_nuxt/app.12345678.js",
      "GET",
      200,
      true,
      "private, no-store, max-age=0",
    ],
    [
      "/_nuxt/app.12345678.js",
      "POST",
      200,
      false,
      "private, no-store, max-age=0",
    ],
    [
      "/_nuxt/app.12345678.js",
      "GET",
      500,
      false,
      "private, no-store, max-age=0",
    ],
  ]) {
    const event = nodeEvent(path, method);
    applyPolicy(event);
    event.node.res.writeHead(status, {
      "Cache-Control": "public",
      "X-Keep": "kept",
      ...(cookie ? { "Set-Cookie": "fixture=opaque" } : {}),
    });
    assert.equal(event.node.res.getHeader("cache-control"), expected);
    for (const name of ["cdn-cache-control", "cloudflare-cdn-cache-control"])
      assert.equal(
        event.node.res.getHeader(name),
        expected.startsWith("public") ? "public, max-age=31536000" : "no-store",
      );
    assert.equal(event.node.res.getHeader("x-keep"), "kept");
    if (cookie)
      assert.equal(event.node.res.getHeader("set-cookie"), "fixture=opaque");
  }
});

test("logout body limits reject declared or streamed excess while preserving bounded protocol input", async () => {
  const configure = (event) => {
    event.context.config = {
      public: {
        auth0: { routes: { backchannelLogout: "/auth/backchannel-logout" } },
      },
    };
    return event;
  };
  const normal = configure(
    nodeEvent("/auth/backchannel-logout", "POST", [
      Buffer.from("logout_token=fixture"),
    ]),
  );
  await bodyLimit(normal);
  assert.equal(
    Buffer.from(normal._requestBody).toString(),
    "logout_token=fixture",
  );
  for (const event of [
    nodeEvent("/auth/backchannel-logout", "POST", [], {
      "content-length": "1000000",
    }),
    nodeEvent("/AUTH/backchannel-logout/?probe=1", "POST", [
      Buffer.alloc(16385),
    ]),
  ]) {
    await assert.rejects(
      bodyLimit(configure(event)),
      (error) => error.statusCode === 413,
    );
    assert.equal(event.node.res.getHeader("connection"), "close");
  }
});

test("only verified envelope expiry becomes anonymous and clears every matching session cookie", async () => {
  const event = nodeEvent("/auth/profile", "GET", [], {
    cookie: "__a0_session.0=opaque; __a0_session.1=opaque; unrelated=kept",
  });
  let failure = new errors.JWTExpired(
    "expired",
    { exp: 0 },
    "exp",
    "check_failed",
  );
  event.context.auth0ClientOptions = {};
  event.context.auth0Client = {
    getSession: async () => {
      throw failure;
    },
    getUser: async () => {
      throw failure;
    },
  };
  sessionExpiry(event);
  assert.equal(await event.context.auth0Client.getSession(), undefined);
  const cleared = event.node.res.getHeader("set-cookie");
  assert.equal(cleared.length, 2);
  assert.ok(
    cleared.every(
      (value) => /Max-Age=0/i.test(value) && /HttpOnly/i.test(value),
    ),
  );
  assert.ok(cleared.some((value) => value.startsWith("__a0_session.0=")));
  assert.ok(cleared.some((value) => value.startsWith("__a0_session.1=")));
  for (const error of [
    new Error("configuration failure"),
    new errors.JWTClaimValidationFailed("issuer", {}, "iss", "check_failed"),
    new errors.JWTExpired("other", {}, "other", "check_failed"),
  ]) {
    failure = error;
    await assert.rejects(
      event.context.auth0Client.getUser(),
      (actual) => actual === error,
    );
  }
});

test("rolling quotas recover at their boundary, isolate exact subjects and fail closed at capacity", () => {
  let time = 0;
  const limit = createAuth0SyncRateLimiter({
    maxRequests: 1,
    windowMs: 1000,
    maxIdentities: 2,
    now: () => time,
  });
  assert.equal(limit.consume("Case").allowed, true);
  assert.equal(limit.consume("case").allowed, true);
  assert.deepEqual(limit.consume("third"), {
    allowed: false,
    reason: "capacity",
  });
  time = 999;
  assert.deepEqual(limit.consume("Case"), {
    allowed: false,
    reason: "quota",
    retryAfterSeconds: 1,
  });
  time = 1000;
  assert.equal(limit.consume("third").allowed, true);
  assert.equal(limit.consume("Case").allowed, true);
  assert.throws(
    () => createAuth0SyncRateLimiter({ maxRequests: 0, windowMs: 1000 }),
    TypeError,
  );
});
