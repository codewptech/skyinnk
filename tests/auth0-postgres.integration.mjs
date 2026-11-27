// Opt-in real PostgreSQL 18 integration check. NEVER run against Neon or production.
// The GitHub workflow supplies only a local disposable database on 127.0.0.1:55432.
import assert from "node:assert/strict";
import { syncAuth0User } from "../server/utils/auth0-user.ts";
import prisma from "../server/utils/prisma.ts";

const url = new URL(process.env.DATABASE_URL || "");
assert.equal(
  url.hostname,
  "127.0.0.1",
  "Only a local disposable PG host is allowed",
);
assert.equal(url.port, "55432", "Only the isolated test port is allowed");
assert.equal(
  url.pathname,
  "/skyinnk_fixture",
  "Only the fictional DB is allowed",
);

const parallel = "fixture|parallel-first-sync";
const freshness = "fixture|concurrent-watermark";
try {
  const created = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      syncAuth0User({
        sub: parallel,
        name: `First ${i}`,
        updated_at: "2026-11-20T00:00:00Z",
      }),
    ),
  );
  assert.equal(
    new Set(created.map((x) => x.id)).size,
    1,
    "All first-sync callers must receive the same UUID",
  );
  assert.equal(
    await prisma.user.count({ where: { auth0Id: parallel } }),
    1,
    "Only one permanent subject identity",
  );
  assert.equal(
    created[0].id.split("-")[2][0],
    "7",
    "PostgreSQL must generate native UUIDv7",
  );
  console.log(
    "PASS eight concurrent first-sync calls returned one PostgreSQL UUIDv7 identity",
  );

  const id = (
    await syncAuth0User({
      sub: freshness,
      name: "Older",
      updated_at: "2026-11-18T00:00:00Z",
    })
  ).id;
  const attempts = await Promise.all([
    syncAuth0User({
      sub: freshness,
      name: "Fresh",
      updated_at: "2026-11-21T12:00:00Z",
    }),
    syncAuth0User({
      sub: freshness,
      name: "Stale",
      updated_at: "2026-11-19T12:00:00Z",
    }),
    syncAuth0User({ sub: freshness, name: "Undated" }),
  ]);
  assert.ok(attempts.every((x) => x.id === id));
  const row = await prisma.user.findUniqueOrThrow({
    where: { auth0Id: freshness },
  });
  assert.equal(
    row.name,
    "Fresh",
    "Older or undated claims must not replace a newer profile",
  );
  assert.equal(row.auth0UpdatedAt.toISOString(), "2026-11-21T12:00:00.000Z");
  assert.equal(await prisma.user.count({ where: { auth0Id: freshness } }), 1);
  console.log(
    "PASS concurrent newer/older/undated profile freshness and exact subject identity",
  );

  await syncAuth0User({
    sub: freshness,
    name: "Still stale",
    updated_at: "2026-11-20T00:00:00Z",
  });
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { auth0Id: freshness } }))
      .name,
    "Fresh",
  );
  await syncAuth0User({
    sub: freshness,
    name: "Newer",
    updated_at: "2026-11-22T00:00:00Z",
  });
  const changed = await prisma.user.findUniqueOrThrow({
    where: { auth0Id: freshness },
  });
  assert.equal(changed.name, "Newer");
  assert.ok(
    changed.updatedAt >= changed.createdAt,
    "Database timestamps must be preserved",
  );
  // A raw SQL caller cannot overwrite the database-owned modification time.
  await prisma.$executeRaw`UPDATE "User" SET "updatedAt" = TIMESTAMPTZ '2000-01-01 00:00:00+00' WHERE "auth0Id" = ${freshness}`;
  const timestampGuard = await prisma.user.findUniqueOrThrow({
    where: { auth0Id: freshness },
  });
  assert.ok(timestampGuard.updatedAt >= changed.updatedAt,
    "Direct SQL must not overwrite the database-owned timestamp");
  console.log(
    "PASS atomic newer update and database-owned updatedAt semantics",
  );

  const left = await syncAuth0User({
    sub: "fixture|left",
    email: "duplicate@example.invalid",
  });
  const right = await syncAuth0User({
    sub: "fixture|right",
    email: "duplicate@example.invalid",
  });
  assert.notEqual(
    left.id,
    right.id,
    "Equal email must never merge distinct subjects",
  );
  await assert.rejects(syncAuth0User({ sub: "  " }), TypeError);
  console.log(
    "PASS distinct subjects with equal email and invalid subject rejection",
  );

  const unicode = "fixture|ExactCase-𝑥";
  const unicodeId = (
    await syncAuth0User({
      sub: unicode,
      name: "समीक्षक José 𝑥",
      address: { locality: "क़", country: "IN" },
    })
  ).id;
  const unicodeResult = await syncAuth0User({
    sub: unicode,
    name: "bad\ud800",
    nickname: "Valid 𝑥",
    address: { locality: "bad\udc00" },
  });
  assert.equal(unicodeResult.id, unicodeId);
  const unicodeRow = await prisma.user.findUniqueOrThrow({
    where: { auth0Id: unicode },
  });
  assert.equal(unicodeRow.auth0Id, unicode);
  assert.equal(unicodeRow.name, "समीक्षक José 𝑥");
  assert.equal(unicodeRow.addressLocality, "क़");
  assert.equal(unicodeRow.addressCountry, "IN");
  assert.equal(unicodeRow.nickname, "Valid 𝑥");
  for (const invalid of ["\ud800", "\udc00"]) {
    await assert.rejects(
      syncAuth0User({ sub: "fixture|" + invalid }),
      TypeError,
    );
  }
  console.log(
    "PASS well-formed Unicode identity and invalid optional claim preservation",
  );
} finally {
  await prisma.$disconnect();
}
