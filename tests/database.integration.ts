import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";

const url = process.env.TEST_DATABASE_URL;
if (url && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname))
  throw new Error(
    "Database tests require an isolated loopback database, never production",
  );

test(
  "PostgreSQL 18 migration and synchronization invariants",
  { skip: !url },
  async (t) => {
    process.env.DATABASE_URL = url;
    const { default: db } = await import("../server/utils/prisma.ts");
    const { syncAuth0User } = await import("../server/utils/auth0-user.ts");
    const prefix = `test|${randomUUID()}`;
    try {
      const [version] = await db.$queryRaw<
        { version: number }[]
      >`SELECT current_setting('server_version_num')::int AS version`;
      assert.ok(version!.version >= 180000);
      const claims = {
        sub: prefix,
        name: "Original",
        email: "shared@example.invalid",
        email_verified: false,
      };
      await t.test(
        "database-generated UUIDv7, nullable fields and timestamps",
        async () => {
          await syncAuth0User(claims);
          const [row] = await db.$queryRaw<
            {
              id: string;
              uuid_version: number;
              created: boolean;
              updated: boolean;
              nullable: boolean;
            }[]
          >`SELECT id, uuid_extract_version(id)::int AS uuid_version, "createdAt" IS NOT NULL AS created, "updatedAt" IS NOT NULL AS updated, "phoneNumberVerified" IS NULL AS nullable FROM "User" WHERE "auth0Id" = ${prefix}`;
          assert.equal(row!.uuid_version, 7);
          assert.ok(row!.created && row!.updated && row!.nullable);
          const defaults = await db.$queryRaw<
            { column_name: string; column_default: string }[]
          >`SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'User' AND column_name IN ('id', 'createdAt', 'updatedAt')`;
          assert.match(
            defaults.find((c) => c.column_name === "id")!.column_default,
            /uuidv7/,
          );
          for (const key of ["createdAt", "updatedAt"])
            assert.match(
              defaults.find((c) => c.column_name === key)!.column_default,
              /CURRENT_TIMESTAMP|now\(\)/,
            );
        },
      );
      await t.test(
        "unchanged/subject-only synchronization executes UPDATE and preserves primary key/createdAt",
        async () => {
          const before = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          await setTimeout(15);
          await syncAuth0User(claims);
          const after = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          assert.equal(after.id, before.id);
          assert.equal(after.createdAt.getTime(), before.createdAt.getTime());
          assert.ok(after.updatedAt > before.updatedAt);
          await setTimeout(15);
          await syncAuth0User({ sub: prefix });
          const subjectOnly = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          assert.equal(subjectOnly.name, "Original");
          assert.equal(subjectOnly.emailVerified, false);
          assert.ok(subjectOnly.updatedAt > after.updatedAt);
          await setTimeout(15);
          assert.equal(
            (
              await db.user.findUniqueOrThrow({ where: { auth0Id: prefix } })
            ).updatedAt.getTime(),
            subjectOnly.updatedAt.getTime(),
          );
        },
      );
      await t.test(
        "absent fields preserve; explicit clears and valid supplied claims update",
        async () => {
          await syncAuth0User({
            sub: prefix,
            name: null,
            email_verified: null,
            address: { country: "IN" },
            updated_at: 1700000000,
          } as never);
          const row = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          assert.equal(row.name, null);
          assert.equal(row.emailVerified, null);
          assert.equal(row.email, claims.email);
          assert.equal(row.addressCountry, "IN");
          assert.equal(
            row.auth0UpdatedAt!.toISOString(),
            "2023-11-14T22:13:20.000Z",
          );
        },
      );
      await t.test(
        "duplicate email allowed; auth0Id unique; concurrent upserts do not duplicate",
        async () => {
          const sub = `${prefix}-concurrent`;
          const results = await Promise.all(
            Array.from({ length: 12 }, () =>
              syncAuth0User({ sub, email: claims.email }),
            ),
          );
          assert.equal(new Set(results.map((row) => row.id)).size, 1);
          assert.equal(await db.user.count({ where: { auth0Id: sub } }), 1);
          assert.equal(
            await db.user.count({
              where: { email: claims.email, auth0Id: { startsWith: prefix } },
            }),
            2,
          );
          await assert.rejects(db.user.create({ data: { auth0Id: sub } }), {
            code: "P2002",
          });
        },
      );
      await t.test(
        "database trigger also updates timestamps for direct SQL",
        async () => {
          const before = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          await setTimeout(15);
          await db.$executeRaw`UPDATE "User" SET "nickname" = 'Direct SQL' WHERE "auth0Id" = ${prefix}`;
          const after = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          assert.ok(after.updatedAt > before.updatedAt);
          assert.equal(after.id, before.id);
          assert.equal(after.createdAt.getTime(), before.createdAt.getTime());
        },
      );
    } finally {
      await db.user.deleteMany({ where: { auth0Id: { startsWith: prefix } } });
      await db.$disconnect();
    }
  },
);
