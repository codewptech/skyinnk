import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { database, RequestError, resetDatabase } from "./support.mjs";
import {
  createAuth0SyncCoordinator,
  Auth0SyncRateLimitError,
} from "../app/utils/auth0-sync.ts";

const { mapAuth0Profile, syncAuth0User } =
  await import("../server/utils/auth0-user.ts");
beforeEach(resetDatabase);

test("profile normalization preserves supplied values and excludes private or application-owned fields", () => {
  const mapped = mapAuth0Profile({
    sub: "auth0|ExactCase",
    name: "Ada",
    email: "ada@example.invalid",
    email_verified: false,
    address: { country: "IN" },
    updated_at: 0,
    password: "private",
    access_token: "private",
    refresh_token: "private",
    id: "forged",
    createdAt: "forged",
    unknown: "private",
  });
  assert.deepEqual(mapped, {
    auth0Id: "auth0|ExactCase",
    name: "Ada",
    email: "ada@example.invalid",
    emailVerified: false,
    addressCountry: "IN",
    auth0UpdatedAt: new Date(0),
  });
  assert.deepEqual(
    mapAuth0Profile({
      sub: "auth0|ExactCase",
      name: null,
      email: "",
      phone_number: 42,
      email_verified: "false",
      updated_at: "2026-02-30T00:00:00Z",
    }),
    {
      auth0Id: "auth0|ExactCase",
      name: null,
      email: null,
    },
  );
  assert.equal(
    mapAuth0Profile({
      sub: "user",
      updated_at: "2024-02-29T00:00:00Z",
    }).auth0UpdatedAt.toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
  for (const sub of [undefined, "", "  ", "bad\0subject", "x".repeat(256)])
    assert.throws(() => mapAuth0Profile({ sub }), TypeError);
});

test("synchronization writes only normalized session claims and returns only the stored identifier", async () => {
  const result = await syncAuth0User({
    sub: "session|owner",
    name: "Owner",
    id: "forged",
  });
  assert.deepEqual(result, { id: "stored-user" });
  assert.deepEqual(database.user.createManyAndReturn.mock.calls[0].arguments, [
    {
      data: { auth0Id: "session|owner", name: "Owner" },
      skipDuplicates: true,
      select: { id: true },
    },
  ]);
  assert.equal(database.user.updateManyAndReturn.mock.callCount(), 0);
});

test("an existing subject updates only when the stored profile is no newer", async () => {
  database.user.createManyAndReturn.mock.mockImplementation(async () => []);
  const timestamp = "2026-11-12T00:00:00Z";
  assert.deepEqual(
    await syncAuth0User({ sub: "owner", name: "Current", updated_at: timestamp }),
    { id: "stored-user" },
  );
  const [update] = database.user.updateManyAndReturn.mock.calls[0].arguments;
  assert.deepEqual(update.where, {
    auth0Id: "owner",
    OR: [
      { auth0UpdatedAt: null },
      { auth0UpdatedAt: { lte: new Date(timestamp) } },
    ],
  });
  assert.equal(database.$transaction.mock.calls[0].arguments[1].isolationLevel, "ReadCommitted");
  assert.equal(database.user.findUniqueOrThrow.mock.callCount(), 0);
});

test("undated claims cannot clear a watermark and a skipped write still returns the subject ID", async () => {
  database.user.createManyAndReturn.mock.mockImplementation(async () => []);
  database.user.updateManyAndReturn.mock.mockImplementation(async () => []);
  for (const updated_at of [undefined, null, "", "invalid"]) {
    assert.deepEqual(await syncAuth0User({ sub: "owner", updated_at }), {
      id: "stored-user",
    });
  }
  for (const { arguments: [update] } of database.user.updateManyAndReturn.mock.calls) {
    assert.deepEqual(update.where, { auth0Id: "owner", OR: [{ auth0UpdatedAt: null }] });
    assert.equal("auth0UpdatedAt" in update.data, false);
  }
  assert.equal(database.user.findUniqueOrThrow.mock.callCount(), 4);
  const failure = new RequestError("P1001");
  database.user.updateManyAndReturn.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(syncAuth0User({ sub: "owner" }), (error) => error === failure);
});

test("two concurrent first-time syncs resolve one permanent subject ID in the mocked conflict path", async () => {
  let attempts = 0;
  database.user.createManyAndReturn.mock.mockImplementation(async ({ data }) => {
    assert.equal(data.auth0Id, "same|verified-subject");
    return ++attempts === 1 ? [{ id: "stored-user" }] : [];
  });
  const [first, second] = await Promise.all([
    syncAuth0User({ sub: "same|verified-subject", name: "First" }),
    syncAuth0User({ sub: "same|verified-subject", name: "Second" }),
  ]);
  assert.deepEqual(first, { id: "stored-user" });
  assert.deepEqual(second, { id: "stored-user" });
  assert.equal(attempts, 2);
  assert.equal(database.user.updateManyAndReturn.mock.callCount(), 1);
});

test("older timestamp cannot pass the atomic profile-update predicate", async () => {
  database.user.createManyAndReturn.mock.mockImplementation(async () => []);
  database.user.updateManyAndReturn.mock.mockImplementation(async ({ where }) => {
    assert.equal(where.auth0Id, "stored|subject");
    assert.equal(where.OR[1].auth0UpdatedAt.lte.toISOString(), "2025-01-01T00:00:00.000Z");
    // The simulated stored watermark is later; no row may be updated.
    return [];
  });
  const stored = await syncAuth0User({
    sub: "stored|subject", name: "Stale", updated_at: "2025-01-01T00:00:00Z",
  });
  assert.deepEqual(stored, { id: "stored-user" });
  assert.equal(database.user.findUniqueOrThrow.mock.callCount(), 1);
});

// These unit controls model conflict responses; only a real disposable
// PostgreSQL integration test can establish lock/commit behavior under load.
test("client synchronization follows eligible visits, late profiles, identity changes and freshness", async (t) => {
  const user = ref();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: {}, meta: { middleware: ["auth0-sync"] } },
      { path: "/privacy-policy", component: {} },
    ],
  });
  let now = 0,
    calls = 0;
  const coordinator = createAuth0SyncCoordinator({
    user,
    router,
    freshnessMs: 1000,
    now: () => now,
    request: async () => {
      calls++;
    },
  });
  t.after(() => coordinator.dispose());
  await router.push("/");
  coordinator.enter();
  await setImmediate();
  assert.equal(calls, 0);
  user.value = { sub: "account-a" };
  await setImmediate();
  coordinator.enter();
  await setImmediate();
  assert.equal(calls, 1);
  await router.push("/privacy-policy");
  user.value = { sub: "account-b" };
  await setImmediate();
  assert.equal(calls, 1);
  await router.push("/");
  coordinator.enter();
  await setImmediate();
  assert.equal(calls, 2);
  now = 999;
  coordinator.enter();
  await setImmediate();
  assert.equal(calls, 2);
  now = 1000;
  coordinator.enter();
  await setImmediate();
  assert.equal(calls, 3);
});

test("client failures preserve navigation, deduplicate in-flight work and honor retry cooldown", async (t) => {
  const user = ref({ sub: "owner" });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: {} }],
  });
  await router.push("/");
  let now = 0,
    calls = 0,
    release;
  const coordinator = createAuth0SyncCoordinator({
    user,
    router,
    freshnessMs: 1000,
    now: () => now,
    request: () => {
      calls++;
      return new Promise((resolve, reject) => {
        release = () => reject(new Auth0SyncRateLimitError("2", now));
      });
    },
  });
  t.after(() => coordinator.dispose());
  const first = coordinator.synchronize();
  assert.equal(coordinator.synchronize(), first);
  await setImmediate();
  release();
  await first;
  now = 1999;
  await coordinator.synchronize();
  assert.equal(calls, 1);
  now = 2000;
  const retry = coordinator.synchronize();
  await setImmediate();
  release();
  await retry;
  assert.equal(calls, 2);
  assert.equal(router.currentRoute.value.path, "/");
  assert.equal(user.value.sub, "owner");
  assert.equal(
    new Auth0SyncRateLimitError("Thu, 01 Jan 1970 00:00:02 GMT", 0)
      .retryAfterMs,
    2000,
  );
  assert.equal(new Auth0SyncRateLimitError("invalid", 0).retryAfterMs, 30000);
});
