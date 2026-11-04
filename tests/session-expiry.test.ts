import test from "node:test";
import assert from "node:assert/strict";
import { errors } from "jose";
import { readWithSessionExpiry } from "../server/utils/session-expiry.ts";

test("only actual JWE exp failures become anonymous and clear cookies", async () => {
  let cleared = 0;
  assert.equal(
    await readWithSessionExpiry(
      async () => {
        throw new errors.JWTExpired(
          "expired",
          { exp: 0 },
          "exp",
          "check_failed",
        );
      },
      () => {
        cleared++;
      },
    ),
    undefined,
  );
  assert.equal(cleared, 1);
  for (const error of [
    new Error("configuration failure"),
    Object.assign(new Error("pretend expiry"), {
      code: "ERR_JWT_EXPIRED",
      claim: "exp",
    }),
    new errors.JWTClaimValidationFailed("issuer", {}, "iss", "check_failed"),
    new errors.JWTExpired("other claim", {}, "other", "check_failed"),
  ]) {
    await assert.rejects(
      readWithSessionExpiry(
        async () => {
          throw error;
        },
        () => {
          cleared++;
        },
      ),
      (actual) => actual === error,
    );
  }
  const session = { user: { sub: "auth0|valid" } };
  assert.equal(
    await readWithSessionExpiry(
      async () => session,
      () => {
        cleared++;
      },
    ),
    session,
  );
  assert.equal(cleared, 1);
});
