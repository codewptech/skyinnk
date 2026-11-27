import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Docker deny-all context includes each direct relative build-validator script dependency", () => {
  const rules = read(".dockerignore").split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));
  assert.equal(rules[0], "**", "preserve deny-all context");
  const directory = rules.indexOf("!scripts/");
  const excludeChildren = rules.indexOf("scripts/**");
  assert.ok(directory >= 0 && excludeChildren > directory, "exclude children after admitting scripts directory");
  assert.ok(rules.indexOf("!scripts/validate-public-content.ts") > excludeChildren);
  assert.deepEqual(rules.filter(line => line.startsWith("!scripts/") && line !== "!scripts/").sort(), ["!scripts/parse-unique-json.ts", "!scripts/validate-public-content.ts"]);
  const validator = read("scripts/validate-public-content.ts");
  const dependencies = [...validator.matchAll(/from\s+["']\.\/([^"']+)["']/g)]
    .map(match => "scripts/" + match[1]);
  assert.ok(dependencies.includes("scripts/parse-unique-json.ts"));
  for (const path of dependencies)
    assert.ok(rules.indexOf("!" + path) > excludeChildren, "missing exact Docker build input: " + path);
  assert.ok(!rules.includes("!scripts/**"), "do not broadly expose scripts");
  for (const exclusion of ["**/.env*", "**/*.pem", "**/*.key"])
    assert.ok(rules.includes(exclusion), "preserve sensitive exclusion: " + exclusion);
});

test("disposable recovery runs for both validator inputs and this regression on PR and push", () => {
  const workflow = read(".github/workflows/v1-recovery-rehearsal.yml");
  const paths = ["scripts/validate-public-content.ts", "scripts/parse-unique-json.ts", "app/utils/render-markdown.ts", "shared/public-content.ts", "tests/docker-build-context.test.mjs"];
  for (const event of ["pull_request", "push"]) {
    const match = workflow.match(new RegExp("^  " + event + ":\\n([\\s\\S]*?)(?=^  [a-z_]+:|^permissions:)", "m"));
    assert.ok(match, "missing workflow trigger: " + event);
    for (const path of paths)
      assert.ok(match[1].split(/\r?\n/).some(line => line.trim() === "- " + path), event + " missing " + path);
  }
});
