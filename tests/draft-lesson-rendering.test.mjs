import test from "node:test";
import assert from "node:assert/strict";
import { candidates, checkDraftRendering, checkAllDrafts } from "../scripts/check-draft-lesson-rendering.mjs";

test("all seven original editorial manuscripts render without structural or KaTeX errors", () => {
  const report = checkAllDrafts();
  assert.equal(report.length, 7);
  assert.deepEqual(report.map(row => row.id), candidates.map(candidate => candidate.id));
  for (const row of report) {
    assert.deepEqual(row.issues, [], JSON.stringify(row));
    assert.ok(row.headings >= 2);
    if (row.id.startsWith("M-")) assert.ok(row.math > 0);
  }
  assert.ok(report.some(row => row.tables > 0 && row.headers > 0));
});

const candidate = { id: "SYNTHETIC", math: true };
const draft = body => "## Learning outcomes\n\n**NOT EDUCATOR APPROVED**\n\n" + body + "\n\n## Before moving on\n\nTest.";

test("preflight catches invalid math and missing MathML without claiming accuracy", () => {
  assert.deepEqual(checkDraftRendering(candidate, draft("$x^2$")).issues, []);
  assert.match(checkDraftRendering(candidate, draft("$\\badcommand{x}$")).issues.join("|"), /KaTeX/);
  assert.match(checkDraftRendering(candidate, draft("No math")).issues.join("|"), /MathML/);
  assert.match(checkDraftRendering(candidate, draft("$\\badcommand{x}$")).issues.join("|"), /KaTeX/);
  assert.match(checkDraftRendering(candidate, draft("$" + "x".repeat(4001) + "$")).issues.join("|"), /KaTeX/);
  const code = checkDraftRendering(candidate, draft("$x^2$\n\n" + "\x60$\\badcommand{x}$\x60"));
  assert.deepEqual(code.issues, []);
  assert.equal(code.parsedMath, 1);
});

test("preflight rejects heading breaks, missing notice and unsupported staged media", () => {
  const text = { id: "SYNTHETIC", math: false };
  assert.match(checkDraftRendering(text, draft("#### Skipped heading")).issues.join("|"), /Skipped/);
  assert.match(checkDraftRendering(text, draft("# Page heading")).issues.join("|"), /H1/);
  assert.match(checkDraftRendering(text, draft("Text").replace("NOT EDUCATOR APPROVED", "Test")).issues.join("|"), /notice/);
  assert.match(checkDraftRendering(text, draft("![Test](/resources/public/test.png)")).issues.join("|"), /media\/resource/);
  assert.deepEqual(checkDraftRendering(text, draft("| A | B |\n| --- | --- |\n| 1 | 2 |")).issues, []);
});
