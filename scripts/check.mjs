import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// These values override local .env settings for every check. No check deploys a
// migration or needs a reachable database, Auth0 tenant, or analytics service.
const secrets = [randomUUID(), randomUUID()];
const env = {
  ...process.env,
  DATABASE_URL: "postgresql://validation@127.0.0.1:1/validation",
  DIRECT_URL: "postgresql://validation@127.0.0.1:1/validation",
  NUXT_AUTH0_DOMAIN: "validation.example.invalid",
  NUXT_AUTH0_CLIENT_ID: "validation",
  NUXT_AUTH0_CLIENT_SECRET: secrets[0],
  NUXT_AUTH0_SESSION_SECRET: secrets[1],
  NUXT_AUTH0_APP_BASE_URL: "https://validation.example.invalid",
  NUXT_PUBLIC_ANALYTICS_ENABLED: "false",
};

for (const [command, args] of [
  ["prisma", ["validate"]],
  ["prisma", ["generate"]],
  ["nuxt", ["typecheck"]],
  ["npm", ["run", "build"]],
]) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

let files = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.isFile()) {
      files++;
      const bytes = await readFile(path);
      assert.ok(
        secrets.every((secret) => !bytes.includes(Buffer.from(secret))),
        `Build secret exposed in ${path}`,
      );
    }
  }
}
await scan(".output");
assert.ok(files > 0, "Production output is missing");
console.log(`PASS: ${files} production artifacts exclude build-secret markers`);
