import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, symlink, writeFile, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { inspectPublicResource } from "../scripts/inspect-public-resource.mjs";

const temp = () => mkdtemp(join(tmpdir(), "skyinnk-approval-safe-resource-"));

test("read-only inspector emits only candidate public metadata for synthetic bytes", async (t) => {
  const root = await temp();
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "worksheet.txt");
  const bytes = Buffer.from("Fictional reviewed-content placeholder\n", "utf8");
  await writeFile(file, bytes);
  const before = await readFile(file);
  const result = await inspectPublicResource(file, "/resources/public/lesson-one/worksheet.txt");
  assert.deepEqual(result, {
    url: "/resources/public/lesson-one/worksheet.txt",
    type: "TXT",
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  assert.deepEqual(await readFile(file), before, "inspection cannot modify the source file");
  assert.deepEqual((await readdir(root)).sort(), ["worksheet.txt"]);
  assert.equal("reviewedBy" in result, false);
  assert.equal("publication" in result, false);
});

test("rejects unsafe public names and mismatching or unsupported extensions", async (t) => {
  const root = await temp();
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "diagram.png");
  await writeFile(file, "synthetic fixture bytes");
  for (const url of [
    "/resources/public/../private.png",
    "/resources/public/%2e%2e/secret.png",
    "/resources/public/unsafe name.png",
    "/resources/public/file.svg",
    "/resources/public/file.gif",
    "https://attacker.invalid/file.png",
    "//attacker.invalid/file.png",
    "/resources/public/file.png?token=yes",
    "/resources/public/file.PnG",
    "/resources/elsewhere/file.png",
    "/resources/public/file.pdf",
  ]) {
    await assert.rejects(inspectPublicResource(file, url), TypeError, url);
  }
});

test("rejects empty files, directories, symlinks and absent input", async (t) => {
  const root = await temp();
  t.after(() => rm(root, { recursive: true, force: true }));
  const empty = join(root, "empty.txt");
  const alias = join(root, "alias.txt");
  await writeFile(empty, "");
  await symlink(empty, alias);
  await assert.rejects(inspectPublicResource(empty, "/resources/public/empty.txt"), TypeError);
  await assert.rejects(inspectPublicResource(alias, "/resources/public/alias.txt"), TypeError);
  await assert.rejects(inspectPublicResource(root, "/resources/public/root.txt"), TypeError);
  await assert.rejects(inspectPublicResource(join(root,"missing.txt"), "/resources/public/missing.txt"), { code: "ENOENT" });
  await assert.rejects(inspectPublicResource(null, "/resources/public/missing.txt"), TypeError);
});

test("real command emits only metadata JSON and uses nonzero exit for mistakes", async (t) => {
  const root = await temp();
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "sample.txt");
  await writeFile(file, "fictional\n");
  const script = fileURLToPath(new URL("../scripts/inspect-public-resource.mjs", import.meta.url));
  const good = spawnSync(process.execPath, [script, file, "/resources/public/sample.txt"], { encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  const output = JSON.parse(good.stdout);
  assert.equal(output.sizeBytes, 10);
  assert.equal(output.type, "TXT");
  assert.equal(good.stderr, "");
  const bad = spawnSync(process.execPath, [script, file, "/resources/public/sample.pdf"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /extension must match/);
  const usage = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /Usage:/);
});

// Isolate the injected built-in binding and bound the time spent in a blocking
// open on an unfixed inspector. Only synthetic files are modified.
for (const mode of ["overwrite", "fifo"]) {
  test(`inspector rejects ${mode} substitution after lstat without hanging`, {
    skip: mode === "fifo" && process.platform === "win32",
  }, async (t) => {
    const root = await temp();
    t.after(() => rm(root, { recursive: true, force: true }));
    const script = new URL("../scripts/inspect-public-resource.mjs", import.meta.url).href;
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import fs from "node:fs/promises";
      import { syncBuiltinESMExports } from "node:module";
      import { execFileSync } from "node:child_process";
      const [script, file, mode] = process.argv.slice(1);
      const { inspectPublicResource } = await import(script);
      await fs.writeFile(file, "original");
      const originalLstat = fs.lstat;
      let changed = false;
      fs.lstat = async (...args) => {
        const info = await originalLstat(...args);
        if (args[0] === file && !changed) {
          changed = true;
          if (mode === "fifo") {
            await fs.rename(file, file + ".original");
            execFileSync("mkfifo", [file]);
          } else {
            await fs.writeFile(file, "CHANGED!");
            // Distinct metadata even on filesystems with coarse timestamps.
            await fs.utimes(file, 1, 1);
          }
        }
        return info;
      };
      syncBuiltinESMExports();
      try {
        await assert.rejects(inspectPublicResource(file, "/resources/public/sample.txt"), /file changed/i);
        assert.equal(changed, true);
      } finally {
        fs.lstat = originalLstat;
        syncBuiltinESMExports();
      }
    `, script, join(root, "sample.txt"), mode], { encoding: "utf8", timeout: 5000 });
    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr);
  });
}
