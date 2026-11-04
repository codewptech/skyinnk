import { Prisma } from "@prisma/client";
import type { UserClaims } from "@auth0/auth0-server-js";
import prisma from "./prisma.ts";

const stringClaims = {
  name: "name",
  given_name: "givenName",
  family_name: "familyName",
  middle_name: "middleName",
  nickname: "nickname",
  preferred_username: "preferredUsername",
  email: "email",
  phone_number: "phoneNumber",
  picture: "picture",
  profile: "profile",
  website: "website",
  gender: "gender",
  birthdate: "birthdate",
  zoneinfo: "zoneinfo",
  locale: "locale",
} as const;

const addressClaims = {
  formatted: "addressFormatted",
  street_address: "addressStreetAddress",
  locality: "addressLocality",
  region: "addressRegion",
  postal_code: "addressPostalCode",
  country: "addressCountry",
} as const;

function optionalString(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  return typeof value === "string" && !value.includes("\0") ? value : undefined;
}

export function validAuth0Subject(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 255 &&
    value.trim().length > 0 &&
    !value.includes("\0")
  );
}

// OIDC uses NumericDate seconds; Auth0 profiles may supply an ISO/RFC3339 string.
function profileTimestamp(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  let milliseconds: number;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    milliseconds = value * 1000;
  } else if (typeof value === "string") {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
        value,
      );
    if (
      !match ||
      Number(match[4]) > 23 ||
      Number(match[5]) > 59 ||
      Number(match[6]) > 59
    )
      return undefined;
    const year = Number(match[1]),
      month = Number(match[2]),
      day = Number(match[3]);
    const days = [
      31,
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    if (
      year < 1 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > days[month - 1]!
    )
      return undefined;
    milliseconds = Date.parse(value);
  } else {
    return undefined;
  }
  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

/** Only call with claims read from the SDK's verified server session. */
export function mapAuth0Profile(claims: UserClaims): Prisma.UserCreateInput {
  if (!validAuth0Subject(claims?.sub))
    throw new TypeError("A valid Auth0 subject is required");
  const data: Prisma.UserCreateInput = { auth0Id: claims.sub };
  for (const [claim, field] of Object.entries(stringClaims)) {
    const value = optionalString(claims[claim]);
    if (value !== undefined) data[field] = value;
  }
  for (const [claim, field] of [
    ["email_verified", "emailVerified"],
    ["phone_number_verified", "phoneNumberVerified"],
  ] as const) {
    const value = claims[claim];
    if (value === null || typeof value === "boolean") data[field] = value;
  }
  const address = claims.address;
  if (address === null) {
    for (const field of Object.values(addressClaims)) data[field] = null;
  } else if (
    typeof address === "object" &&
    !Array.isArray(address) &&
    address !== null
  ) {
    for (const [claim, field] of Object.entries(addressClaims)) {
      const value = optionalString((address as Record<string, unknown>)[claim]);
      if (value !== undefined) data[field] = value;
    }
  }
  const timestamp = profileTimestamp(claims.updated_at);
  if (timestamp !== undefined) data.auth0UpdatedAt = timestamp;
  return data;
}

/** No tokens, browser profile data, application-owned fields, IDs or timestamps are written. */
export async function syncAuth0User(claims: UserClaims) {
  const data = mapAuth0Profile(claims);
  const upsert = () =>
    prisma.user.upsert({
      where: { auth0Id: data.auth0Id },
      create: data,
      // Self-assignment guarantees a real UPDATE even for a subject-only profile.
      // This also keeps the query eligible for PostgreSQL's native ON CONFLICT.
      update: data,
      select: { id: true },
    });
  try {
    return await upsert();
  } catch (error) {
    // Bounded fallback if Prisma cannot use a native upsert in a future version.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("auth0Id")
    ) {
      return upsert();
    }
    throw error;
  }
}
