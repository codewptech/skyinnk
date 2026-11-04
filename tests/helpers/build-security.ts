import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { isolatedDatabaseUrl } from "./production.ts";

const markers = [randomUUID(), randomUUID()];
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: isolatedDatabaseUrl(),
    DIRECT_URL: isolatedDatabaseUrl(),
    NUXT_AUTH0_DOMAIN: "build-test.example.invalid",
    NUXT_AUTH0_CLIENT_ID: "build-test",
    NUXT_AUTH0_CLIENT_SECRET: markers[0],
    NUXT_AUTH0_SESSION_SECRET: markers[1],
    NUXT_AUTH0_APP_BASE_URL: "http://127.0.0.1:3000",
  },
});
assert.equal(result.status, 0, "Security fixture build failed");
async function inspect(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (entry.isFile()) {
      const bytes = await readFile(file);
      for (const marker of markers)
        assert.ok(
          !bytes.includes(Buffer.from(marker)),
          `Build credential captured in ${file}`,
        );
    }
  }
}
await inspect(".output");
console.log(
  "PASS: server and public artifacts exclude both build-time secret markers",
);
