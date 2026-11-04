import test from "node:test";
import assert from "node:assert/strict";
import { ref } from "vue";
import { createRouter, createMemoryHistory } from "vue-router";
import { setImmediate } from "node:timers/promises";
import {
  createAuth0SyncCoordinator,
  Auth0SyncRateLimitError,
} from "../app/utils/auth0-sync.ts";

function fixture(request?: () => Promise<unknown>) {
  const user = ref<{ sub: string }>();
  let time = 0,
    calls = 0;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: {}, meta: { middleware: ["auth0-sync"] } },
      { path: "/other", component: {} },
    ],
  });
  const coordinator = createAuth0SyncCoordinator({
    user,
    router,
    now: () => time,
    freshnessMs: 300_000,
    request: () => {
      calls++;
      return request?.() ?? Promise.resolve({ synced: true });
    },
  });
  router.beforeEach((to) => {
    if (
      Array.isArray(to.meta.middleware) &&
      to.meta.middleware.includes("auth0-sync")
    )
      coordinator.enter();
  });
  return {
    user,
    router,
    coordinator,
    calls: () => calls,
    tick: (ms: number) => {
      time += ms;
    },
  };
}

test("anonymous visits skip; late SDK profile loading synchronizes exactly once", async () => {
  const f = fixture();
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 0);
  f.user.value = { sub: "auth0|a" };
  await setImmediate();
  assert.equal(f.calls(), 1);
  f.coordinator.enter(); // Hydration/repeated registration deduplicates.
  await setImmediate();
  assert.equal(f.calls(), 1);
  f.coordinator.dispose();
});

test("non-eligible navigation stops subscriptions; five-minute freshness controls re-entry", async () => {
  const f = fixture();
  f.user.value = { sub: "auth0|a" };
  await f.router.push("/other");
  assert.equal(f.calls(), 0);
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 1);
  await f.router.push("/other");
  f.user.value = { sub: "auth0|b" };
  await setImmediate();
  assert.equal(f.calls(), 1);
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 2);
  await f.router.push("/other");
  f.tick(299_999);
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 2);
  await f.router.push("/other");
  f.tick(1);
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 3);
  f.coordinator.dispose();
});

test("account switching resets identity state immediately, including switching back", async () => {
  const f = fixture();
  await f.router.push("/");
  for (const [i, sub] of ["auth0|a", "auth0|b", "auth0|a"].entries()) {
    f.user.value = { sub };
    await setImmediate();
    assert.equal(f.calls(), i + 1);
  }
  f.user.value = undefined;
  await setImmediate();
  f.user.value = { sub: "auth0|a" };
  await setImmediate();
  assert.equal(f.calls(), 4);
  f.coordinator.dispose();
});

test("in-flight requests deduplicate and stale account completions cannot mark another identity fresh", async () => {
  const resolvers: (() => void)[] = [];
  const f = fixture(
    () => new Promise<void>((resolve) => resolvers.push(resolve)),
  );
  f.user.value = { sub: "auth0|a" };
  await f.router.push("/");
  const first = f.coordinator.synchronize();
  assert.equal(f.coordinator.synchronize(), first);
  assert.equal(f.calls(), 1);
  f.user.value = { sub: "auth0|b" };
  await setImmediate();
  assert.equal(f.calls(), 2);
  resolvers[0]!();
  await first;
  assert.equal(f.coordinator.synchronize(), f.coordinator.synchronize());
  assert.equal(f.calls(), 2);
  resolvers[1]!();
  await setImmediate();
  f.coordinator.dispose();
});

test("failures leave the page accessible and allow a bounded retry after cooldown", async () => {
  const f = fixture(() => Promise.reject(new Error("database unavailable")));
  f.user.value = { sub: "auth0|a" };
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.router.currentRoute.value.path, "/");
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 1);
  f.tick(30_000);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 2);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 2);
  f.coordinator.dispose();
});

test("cancelled eligible-page navigation does not leak subscriptions", async () => {
  const f = fixture();
  await f.router.push("/other");
  f.router.beforeEach((to) => (to.path === "/" ? false : undefined));
  await f.router.push("/");
  f.user.value = { sub: "auth0|a" };
  await setImmediate();
  assert.equal(f.calls(), 0);
  f.coordinator.dispose();
});

test("429 waits for Retry-After, never marks success, and recovers without redirect/logout", async () => {
  let allowed = false;
  const f = fixture(() =>
    allowed
      ? Promise.resolve()
      : Promise.reject(new Auth0SyncRateLimitError("60", 0)),
  );
  f.user.value = { sub: "auth0|limited" };
  await f.router.push("/");
  await setImmediate();
  assert.equal(f.calls(), 1);
  f.tick(30_000);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 1);
  f.tick(29_999);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 1);
  assert.equal(f.user.value.sub, "auth0|limited");
  assert.equal(f.router.currentRoute.value.path, "/");
  allowed = true;
  f.tick(1);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 2);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 2);
  f.tick(300_000);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 3);
  f.coordinator.dispose();
});

test("valid Retry-After can be shorter than the generic 30-second cooldown", async () => {
  const f = fixture(() => Promise.reject(new Auth0SyncRateLimitError("2", 0)));
  f.user.value = { sub: "auth0|limited" };
  await f.router.push("/");
  await setImmediate();
  f.tick(1999);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 1);
  f.tick(1);
  await f.coordinator.synchronize();
  assert.equal(f.calls(), 2);
  f.coordinator.dispose();
});

test("Retry-After parsing accepts seconds/HTTP dates and safely handles missing or invalid headers", () => {
  assert.equal(new Auth0SyncRateLimitError("60", 0).retryAfterMs, 60_000);
  assert.equal(new Auth0SyncRateLimitError(" 2 ", 0).retryAfterMs, 2000);
  assert.equal(
    new Auth0SyncRateLimitError("Thu, 01 Jan 1970 00:01:00 GMT", 1000)
      .retryAfterMs,
    59_000,
  );
  for (const value of [
    null,
    "",
    "0",
    "-1",
    "1.5",
    "Infinity",
    "junk",
    "9007199254740992",
  ])
    assert.equal(new Auth0SyncRateLimitError(value, 0).retryAfterMs, 30_000);
  assert.equal(
    new Auth0SyncRateLimitError("Thu, 01 Jan 1970 00:01:00 GMT", 120_000)
      .retryAfterMs,
    30_000,
  );
});
