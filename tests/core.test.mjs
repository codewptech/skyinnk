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
  assert.deepEqual(database.user.upsert.mock.calls[0].arguments, [
    {
      where: { auth0Id: "session|owner" },
      create: { auth0Id: "session|owner", name: "Owner" },
      update: { auth0Id: "session|owner", name: "Owner" },
      select: { id: true },
    },
  ]);
});

test("synchronization retries an identity uniqueness conflict once and propagates other failures", async () => {
  const conflict = new RequestError("P2002", { target: ["auth0Id"] });
  database.user.upsert.mock.mockImplementationOnce(async () => {
    throw conflict;
  });
  assert.deepEqual(await syncAuth0User({ sub: "owner" }), {
    id: "stored-user",
  });
  assert.equal(database.user.upsert.mock.callCount(), 2);
  database.user.upsert.mock.mockImplementation(async () => {
    throw conflict;
  });
  await assert.rejects(
    syncAuth0User({ sub: "owner" }),
    (error) => error === conflict,
  );
  assert.equal(database.user.upsert.mock.callCount(), 4);
  const unrelated = new RequestError("P2002", { target: ["email"] });
  database.user.upsert.mock.mockImplementation(async () => {
    throw unrelated;
  });
  await assert.rejects(
    syncAuth0User({ sub: "owner" }),
    (error) => error === unrelated,
  );
  assert.equal(database.user.upsert.mock.callCount(), 5);
});

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
