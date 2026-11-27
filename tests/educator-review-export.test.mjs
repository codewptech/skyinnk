import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { candidates } from "../scripts/check-draft-lesson-rendering.mjs";
import {
  buildEducatorReview,
  exportCurrentDrafts,
} from "../scripts/export-educator-review.mjs";

test("actual seven drafts produce deterministic offline review packet with exact hashes and blank records", () => {
  const html = exportCurrentDrafts();
  assert.equal(html, exportCurrentDrafts());
  assert.match(html, /<!doctype html>/);
  assert.match(html, /NOT EDUCATOR APPROVED OR PUBLISHED/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(
    html,
    /<(?:script|iframe|object|embed|img|form|input)\b/i,
  );
  assert.doesNotMatch(html, /<link\b|@import|url\(/i);
  assert.match(html, /<math\b/);
  assert.match(html, /<th scope="col">/);
  for (const c of candidates) {
    const bytes = readFileSync(
      new URL("../docs/content-review/v1-class10/" + c.file, import.meta.url),
    );
    const sha = createHash("sha256").update(bytes).digest("hex");
    assert.equal(html.split(sha).length - 1, 2, c.id);
    assert.match(html, new RegExp('id="' + c.id + '"'));
  }
  assert.equal([...html.matchAll(/class="decision"/g)].length, 7);
  assert.equal([...html.matchAll(/<td><\/td>/g)].length, 56);
});
test("export refuses unmarked or invalid manuscripts before returning any packet", () => {
  const valid = Buffer.from(
    "## Learning outcomes\n\n**NOT EDUCATOR APPROVED**\n\n$x^2$\n\n## Before moving on\n\nTest.",
  );
  assert.throws(
    () => buildEducatorReview(() => Buffer.from("unmarked")),
    /M-01:/,
  );
  assert.throws(
    () =>
      buildEducatorReview((file) =>
        file === candidates[6].file ? Buffer.from("invalid") : valid,
      ),
    /E-03:/,
  );
  assert.throws(() => buildEducatorReview(() => Buffer.from([0xff, 0xfe])));
});
