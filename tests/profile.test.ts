import test from "node:test";
import assert from "node:assert/strict";
import { mapAuth0Profile } from "../server/utils/auth0-user.ts";

const subject = { sub: "auth0|profile-test" };

test("maps all ordinary claims and flattens address without persisting secrets", () => {
  const result = mapAuth0Profile({
    ...subject,
    name: "Name",
    given_name: "Given",
    family_name: "Family",
    middle_name: "Middle",
    nickname: "Nick",
    preferred_username: "preferred",
    email: "same@example.invalid",
    email_verified: false,
    phone_number: "+12025550123",
    phone_number_verified: true,
    picture: "https://example.invalid/photo",
    profile: "https://example.invalid/profile",
    website: "https://example.invalid",
    gender: "unspecified",
    birthdate: "--04-12",
    zoneinfo: "Asia/Kolkata",
    locale: "en-IN",
    updated_at: 0,
    address: {
      formatted: "Formatted",
      street_address: "Street",
      locality: "Locality",
      region: "Region",
      postal_code: "12345",
      country: "Country",
    },
    access_token: "secret",
    refresh_token: "secret",
    password: "secret",
    id: "forged",
    createdAt: "forged",
    updatedAt: "forged",
    custom: "ignored",
  });
  assert.deepEqual(result, {
    auth0Id: subject.sub,
    name: "Name",
    givenName: "Given",
    familyName: "Family",
    middleName: "Middle",
    nickname: "Nick",
    preferredUsername: "preferred",
    email: "same@example.invalid",
    emailVerified: false,
    phoneNumber: "+12025550123",
    phoneNumberVerified: true,
    picture: "https://example.invalid/photo",
    profile: "https://example.invalid/profile",
    website: "https://example.invalid",
    gender: "unspecified",
    birthdate: "--04-12",
    zoneinfo: "Asia/Kolkata",
    locale: "en-IN",
    auth0UpdatedAt: new Date(0),
    addressFormatted: "Formatted",
    addressStreetAddress: "Street",
    addressLocality: "Locality",
    addressRegion: "Region",
    addressPostalCode: "12345",
    addressCountry: "Country",
  });
});

test("absent and invalid claims are omitted; booleans never default to false", () => {
  assert.deepEqual(mapAuth0Profile(subject), { auth0Id: subject.sub });
  assert.deepEqual(
    mapAuth0Profile({
      ...subject,
      name: 12,
      email_verified: "false",
      phone_number_verified: 0,
      address: [],
      updated_at: NaN,
    } as never),
    { auth0Id: subject.sub },
  );
  assert.deepEqual(
    mapAuth0Profile({
      ...subject,
      name: "invalid\0value",
      address: { country: 45 },
    } as never),
    { auth0Id: subject.sub },
  );
});

test("explicit null or empty text clears; partial addresses preserve absent fields", () => {
  assert.deepEqual(
    mapAuth0Profile({
      ...subject,
      name: "",
      email: null,
      email_verified: null,
      updated_at: null,
      address: { country: "", locality: null },
    } as never),
    {
      auth0Id: subject.sub,
      name: null,
      email: null,
      emailVerified: null,
      auth0UpdatedAt: null,
      addressCountry: null,
      addressLocality: null,
    },
  );
  const result = mapAuth0Profile({ ...subject, address: null });
  assert.equal(
    Object.entries(result).filter(
      ([key, value]) => key.startsWith("address") && value === null,
    ).length,
    6,
  );
});

test("updated_at accepts finite NumericDate seconds and validated ISO timestamps", () => {
  assert.equal(
    (
      mapAuth0Profile({ ...subject, updated_at: 1700000000.123 })
        .auth0UpdatedAt as Date
    ).toISOString(),
    "2023-11-14T22:13:20.123Z",
  );
  assert.equal(
    (
      mapAuth0Profile({ ...subject, updated_at: "2024-02-29T05:30:00+05:30" })
        .auth0UpdatedAt as Date
    ).toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
  for (const updated_at of [
    "2024-01-01T24:00:00Z",
    "2025-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z",
    "2024-01-01",
    "1700000000",
    Infinity,
    -1,
    1e25,
    {},
    true,
  ]) {
    assert.equal(
      mapAuth0Profile({ ...subject, updated_at }).auth0UpdatedAt,
      undefined,
    );
  }
});

test("requires a valid, case-sensitive Auth0 subject", () => {
  for (const sub of [
    undefined,
    null,
    "",
    " ",
    123,
    "x".repeat(256),
    "bad\0subject",
  ])
    assert.throws(() => mapAuth0Profile({ sub } as never));
  assert.equal(
    mapAuth0Profile({ sub: "Auth0|CaseSensitive" }).auth0Id,
    "Auth0|CaseSensitive",
  );
});
