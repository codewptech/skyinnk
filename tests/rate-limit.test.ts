import test from "node:test";
import assert from "node:assert/strict";
import { createAuth0SyncRateLimiter } from "../server/utils/auth0-sync-rate-limit.ts";

function fixture(maxRequests = 10, windowMs = 60_000, maxIdentities = 10_000) {
  let time = 0;
  const limiter = createAuth0SyncRateLimiter({
    maxRequests,
    windowMs,
    maxIdentities,
    now: () => time,
  });
  return {
    ...limiter,
    at(value: number) {
      time = value;
    },
  };
}

test("first ten requests are admitted; the eleventh is denied with an accurate delay", () => {
  const limit = fixture();
  for (let i = 0; i < 10; i++)
    assert.deepEqual(limit.consume("auth0|one"), { allowed: true });
  assert.deepEqual(limit.consume("auth0|one"), {
    allowed: false,
    reason: "quota",
    retryAfterSeconds: 60,
  });
  limit.at(58_999);
  assert.deepEqual(limit.consume("auth0|one"), {
    allowed: false,
    reason: "quota",
    retryAfterSeconds: 2,
  });
  limit.at(59_999);
  assert.deepEqual(limit.consume("auth0|one"), {
    allowed: false,
    reason: "quota",
    retryAfterSeconds: 1,
  });
  limit.at(60_000);
  assert.deepEqual(limit.consume("auth0|one"), { allowed: true });
});

test("a rolling window expires individual admissions instead of resetting at fixed boundaries", () => {
  const limit = fixture(2);
  assert.ok(limit.consume("a").allowed);
  limit.at(10_000);
  assert.ok(limit.consume("a").allowed);
  limit.at(59_999);
  assert.equal(limit.consume("a").allowed, false);
  limit.at(60_000);
  assert.ok(limit.consume("a").allowed);
  assert.deepEqual(limit.consume("a"), {
    allowed: false,
    reason: "quota",
    retryAfterSeconds: 10,
  });
  limit.at(70_000);
  assert.ok(limit.consume("a").allowed);
  assert.equal(limit.consume("a").allowed, false);
});

test("independent exact subjects have independent quotas", () => {
  const limit = fixture(1);
  for (const sub of [
    "auth0|A",
    "auth0|a",
    "google-oauth2|A",
    "\ud800",
    "\ud801",
  ]) {
    assert.ok(limit.consume(sub).allowed);
    assert.equal(limit.consume(sub).allowed, false);
  }
});

test("denied requests do not consume more memory or extend the window", () => {
  const limit = fixture(1, 60_000, 1);
  assert.ok(limit.consume("a").allowed);
  for (let i = 1; i < 1000; i++) {
    limit.at(i * 50);
    assert.equal(limit.consume("a").allowed, false);
  }
  limit.at(60_000);
  assert.ok(limit.consume("new-identity").allowed);
});

test("concurrent promises cannot admit beyond the allowance within one instance", async () => {
  const limit = fixture();
  const results = await Promise.all(
    Array.from({ length: 100 }, () =>
      Promise.resolve().then(() => limit.consume("same")),
    ),
  );
  assert.equal(results.filter((result) => result.allowed).length, 10);
  assert.equal(results.filter((result) => !result.allowed).length, 90);
});

test("bounded storage fails closed without evicting active identities; idle entries expire", () => {
  const limit = fixture(1, 60_000, 2);
  assert.ok(limit.consume("a").allowed);
  limit.at(1000);
  assert.ok(limit.consume("b").allowed);
  for (let i = 0; i < 1000; i++)
    assert.deepEqual(limit.consume(`unknown-${i}`), {
      allowed: false,
      reason: "capacity",
    });
  assert.equal(limit.consume("a").allowed, false);
  limit.at(60_000);
  assert.ok(limit.consume("new").allowed);
  assert.equal(limit.consume("b").allowed, false);
  limit.at(61_000);
  assert.ok(limit.consume("another").allowed);
});

test("invalid policies fail closed instead of disabling protection", () => {
  for (const value of [
    0,
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(() => fixture(value));
    assert.throws(() => fixture(10, value));
    assert.throws(() => fixture(10, 60_000, value));
  }
});
