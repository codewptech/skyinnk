import test from "node:test";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  prepareTextCatalogue,
  prepareFromStaging,
} from "../scripts/prepare-reviewed-text-catalogue.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const bytes = Buffer.from(
  "## Fictional test notes\n\nOriginal synthetic content. $x^2$\n",
);
function fixture(count = 4) {
  // Synthetic test data only; never used for real publication.
  const publication = {
    status: "published",
    visibility: "public",
    reviewedBy: "SYNTHETIC TEST REVIEWER",
    reviewedAt: "2026-11-25T10:00:00+05:30",
  };
  return {
    schemaVersion: 1,
    courses: [
      {
        key: "test-course",
        slug: "test-course",
        title: "Synthetic course",
        summary: "Test only",
        audience: "Test",
        subject: "Test",
        publication: { ...publication },
        modules: [
          {
            key: "test-module",
            title: "Synthetic module",
            position: 0,
            lessons: Array.from({ length: count }, (_, i) => ({
              key: "lesson-" + i,
              slug: "lesson-" + i,
              title: "Test lesson " + i,
              position: i,
              overview: "Synthetic practice",
              notesFile: "notes-" + i + ".md",
              notesSha256: sha(bytes),
              publication: { ...publication },
            })),
          },
        ],
      },
    ],
  };
}
const lessons = (p) => p.courses[0].modules[0].lessons;
test("reviewed bytes are copied exactly, approvals preserved, staging fields omitted, source unchanged", () => {
  const packet = fixture();
  const original = structuredClone(packet);
  const result = prepareTextCatalogue(packet, () => bytes);
  assert.deepEqual(packet, original);
  assert.deepEqual(
    result.courses[0].publication,
    packet.courses[0].publication,
  );
  assert.equal(lessons(result).length, 4);
  for (const [i, lesson] of lessons(result).entries()) {
    assert.equal(lesson.notesMarkdown, bytes.toString("utf8"));
    assert.deepEqual(lesson.publication, lessons(packet)[i].publication);
    assert.equal(lesson.kind, "text");
    assert.ok(
      !("notesSha256" in lesson) &&
        !("notesFile" in lesson) &&
        !("resources" in lesson),
    );
  }
  assert.equal(
    lessons(prepareTextCatalogue(fixture(6), () => bytes)).length,
    6,
  );
});
test("reject missing, placeholder and malformed approvals; never synthesize them", () => {
  for (const mutate of [
    (p) => {
      delete p.courses[0].publication;
    },
    (p) => {
      delete lessons(p)[0].publication.reviewedBy;
    },
    (p) => {
      lessons(p)[0].publication.reviewedBy = "pending";
    },
    (p) => {
      lessons(p)[0].publication.status = "draft";
    },
    (p) => {
      lessons(p)[0].publication.reviewedAt = "2026-11-25T10:00";
    },
    (p) => {
      lessons(p)[0].publication.reviewedAt = "2026-02-30T10:00Z";
    },
  ]) {
    const packet = fixture();
    mutate(packet);
    assert.throws(() => prepareTextCatalogue(packet, () => bytes));
  }
});
test("reject changed bytes, unsafe filenames, duplicate files, unsupported fields and invalid count", () => {
  assert.throws(
    () => prepareTextCatalogue(fixture(), () => Buffer.from("changed")),
    /reviewed bytes/,
  );
  for (const mutate of [
    (p) => {
      lessons(p)[0].notesFile = "../private.md";
    },
    (p) => {
      lessons(p)[0].notesFile = "C:\\private.md";
    },
    (p) => {
      lessons(p)[0].notesFile = "NOTES-1.md";
    },
    (p) => {
      lessons(p)[0].notesSha256 = "";
    },
    (p) => {
      lessons(p)[0].resources = [];
    },
    (p) => {
      lessons(p)[0].slug = lessons(p)[1].slug;
    },
  ]) {
    const packet = fixture();
    mutate(packet);
    assert.throws(() => prepareTextCatalogue(packet, () => bytes));
  }
  for (const count of [3, 7])
    assert.throws(
      () => prepareTextCatalogue(fixture(count), () => bytes),
      /4–6/,
    );
});
test("reject editorial drafts, H1 notes, resource references and invalid UTF-8 even with matching hash", () => {
  for (const source of [
    Buffer.from("## Notes\n\n**NOT EDUCATOR APPROVED**"),
    Buffer.from("# Page title\n## Notes\n\nTest"),
    Buffer.from("## Notes\n\n![Test](/resources/public/test.png)"),
    Buffer.from([0xff, 0xfe, 0xff]),
  ]) {
    const packet = fixture();
    lessons(packet).forEach((lesson) => {
      lesson.notesSha256 = sha(source);
    });
    assert.throws(() => prepareTextCatalogue(packet, () => source));
  }
});
test("external staging is read-only and rejects repository-local files and symlink inputs", () => {
  const root = mkdtempSync(join(tmpdir(), "skyinnk-intake-"));
  try {
    const repo = join(root, "repo"),
      stage = join(root, "stage");
    mkdirSync(repo);
    mkdirSync(stage);
    const path = join(stage, "reviewed-intake.json"),
      packet = fixture();
    const raw = JSON.stringify(packet);
    writeFileSync(path, raw);
    for (const lesson of lessons(packet))
      writeFileSync(join(stage, lesson.notesFile), bytes);
    const before = readdirSync(stage);
    assert.equal(lessons(prepareFromStaging(path, repo)).length, 4);
    assert.deepEqual(readdirSync(stage), before);
    assert.equal(readFileSync(path, "utf8"), raw);
    assert.deepEqual(readFileSync(join(stage, "notes-0.md")), bytes);
    assert.throws(
      () => prepareFromStaging(path, root),
      /outside the repository/,
    );
    rmSync(join(stage, "notes-0.md"));
    symlinkSync(join(stage, "notes-1.md"), join(stage, "notes-0.md"));
    assert.throws(() => prepareFromStaging(path, repo), /regular bounded file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("final edited notes require rendered heading hierarchy and strictly valid parsed math", () => {
  for (const [source, reason] of [
    ["Page title\n==========\n\n## Notes\n\nTest", /rendered headings/],
    ["### Too deep\n\n## Notes\n\nTest", /rendered headings/],
    ["## Notes\n\n#### Skipped level\n\nTest", /rendered headings/],
    ["## Notes\n\n$\\definitelyUnknownCommand{x}$", /invalid parsed math/],
    [
      "## Notes\n\n$$\n\\definitelyUnknownCommand{x}\n$$",
      /invalid parsed math/,
    ],
  ]) {
    const raw = Buffer.from(source);
    const packet = fixture();
    lessons(packet).forEach((lesson) => {
      lesson.notesSha256 = sha(raw);
    });
    assert.throws(() => prepareTextCatalogue(packet, () => raw), reason);
  }
  const valid = Buffer.from(
    [
      "Notes",
      "-----",
      "",
      "### Example",
      "",
      "Valid math: $x^2$.",
      "",
      "~~~text",
      "# Not a heading",
      "$\\definitelyUnknownCommand{x}$",
      "~~~",
      "",
    ].join("\n"),
  );
  const packet = fixture();
  lessons(packet).forEach((lesson) => {
    lesson.notesSha256 = sha(valid);
  });
  const prepared = prepareTextCatalogue(packet, () => valid);
  for (const lesson of lessons(prepared))
    assert.equal(lesson.notesMarkdown, valid.toString("utf8"));
});

test("external intake rejects malformed UTF-8 metadata and preserves valid Unicode", () => {
  const root = mkdtempSync(join(tmpdir(), "skyinnk-intake-utf8-"));
  try {
    const repo = join(root, "repo"),
      stage = join(root, "stage");
    mkdirSync(repo);
    mkdirSync(stage);
    const path = join(stage, "reviewed-intake.json"),
      packet = fixture();
    packet.courses[0].publication.reviewedBy =
      "SYNTHETIC TEST REVIEWER – समीक्षक José";
    for (const lesson of lessons(packet))
      writeFileSync(join(stage, lesson.notesFile), bytes);
    writeFileSync(path, JSON.stringify(packet));
    assert.equal(
      prepareFromStaging(path, repo).courses[0].publication.reviewedBy,
      packet.courses[0].publication.reviewedBy,
    );
    packet.courses[0].publication.reviewedBy =
      "SYNTHETIC TEST REVIEWER CORRUPT_MARKER";
    const raw = JSON.stringify(packet);
    const marker = raw.indexOf("CORRUPT_MARKER");
    assert.ok(marker >= 0);
    const corrupt = Buffer.concat([
      Buffer.from(raw.slice(0, marker)),
      Buffer.from([0xff]),
      Buffer.from(raw.slice(marker + "CORRUPT_MARKER".length)),
    ]);
    writeFileSync(path, corrupt);
    assert.throws(() => prepareFromStaging(path, repo), /invalid UTF-8/);
    assert.deepEqual(readFileSync(path), corrupt);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("external staging rejects same-length file replacement after the regular-file check", (t) => {
  const root = mkdtempSync(join(tmpdir(), "skyinnk-intake-swap-"));
  const originalLstat = fs.lstatSync;
  try {
    const repo = join(root, "repo"),
      stage = join(root, "stage");
    mkdirSync(repo);
    mkdirSync(stage);
    const path = join(stage, "reviewed-intake.json"),
      packet = fixture();
    const raw = JSON.stringify(packet);
    const changed = raw.replace(
      "SYNTHETIC TEST REVIEWER",
      "SYNTHETIC FAKE REVIEWER",
    );
    assert.notEqual(changed, raw);
    assert.equal(Buffer.byteLength(changed), Buffer.byteLength(raw));
    const replacement = join(root, "replacement.json");
    writeFileSync(path, raw);
    writeFileSync(replacement, changed);
    for (const lesson of lessons(packet))
      writeFileSync(join(stage, lesson.notesFile), bytes);
    assert.equal(
      prepareFromStaging(path, repo).courses[0].publication.reviewedBy,
      packet.courses[0].publication.reviewedBy,
    );
    let swapped = false;
    t.mock.method(fs, "lstatSync", (name, ...args) => {
      const info = originalLstat(name, ...args);
      if (name === path && !swapped) {
        swapped = true;
        fs.renameSync(path, path + ".saved");
        symlinkSync(replacement, path);
      }
      return info;
    });
    syncBuiltinESMExports();
    assert.throws(
      () => prepareFromStaging(path, repo),
      /file changed while opening|file changed while reading/,
    );
    assert.ok(swapped);
    assert.equal(readFileSync(path + ".saved", "utf8"), raw);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    rmSync(root, { recursive: true, force: true });
  }
});

test("external reviewed intake rejects duplicate and escaped-equivalent approval members", () => {
  const root = mkdtempSync(join(tmpdir(), "skyinnk-intake-duplicate-"));
  try {
    const repo = join(root, "repo"),
      stage = join(root, "stage");
    mkdirSync(repo);
    mkdirSync(stage);
    const path = join(stage, "reviewed-intake.json"),
      packet = fixture();
    packet.courses[0].summary =
      'Literal string {"reviewedBy":"pending","reviewedBy":"other"}';
    const valid = JSON.stringify(packet);
    for (const lesson of lessons(packet))
      writeFileSync(join(stage, lesson.notesFile), bytes);
    writeFileSync(path, valid);
    const expected = prepareFromStaging(path, repo);
    assert.equal(expected.courses[0].summary, packet.courses[0].summary);
    for (const duplicate of [
      valid.replace(
        '"reviewedBy":"SYNTHETIC TEST REVIEWER"',
        '"reviewedBy":"pending","reviewedBy":"SYNTHETIC TEST REVIEWER"',
      ),
      valid.replace(
        '"status":"published"',
        '"status":"draft","\\u0073tatus":"published"',
      ),
      valid.replace('"schemaVersion":1', '"schemaVersion":2,"schemaVersion":1'),
    ]) {
      assert.notEqual(duplicate, valid);
      assert.deepEqual(JSON.parse(duplicate), packet);
      writeFileSync(path, duplicate);
      assert.throws(
        () => prepareFromStaging(path, repo),
        /duplicate JSON object member/i,
      );
      assert.equal(readFileSync(path, "utf8"), duplicate);
      assert.deepEqual(readFileSync(join(stage, "notes-0.md")), bytes);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
