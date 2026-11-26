import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePublicCatalogue } from "../shared/public-content.ts";
import { checkPublicContent } from "../scripts/validate-public-content.ts";
import { publicCatalogueFixture } from "./fixtures/public-catalogue.mjs";

test("actual publication manifest and physical resource allowlist validate", () => {
  const value = JSON.parse(
    readFileSync(new URL("../content/catalogue.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(validatePublicCatalogue(value), value);
  checkPublicContent();
});
test("public content contract accepts ordered video/text fixtures across modules", () => {
  const value = publicCatalogueFixture();
  assert.equal(validatePublicCatalogue(value).courses[0].modules.length, 2);
});
test("publication rejects drafts, unreviewed records, unsafe identifiers and duplicate course-wide lesson routes", () => {
  for (const mutate of [
    (v) => (v.courses[0].publication.status = "draft"),
    (v) => delete v.courses[0].modules[0].lessons[0].publication.reviewedBy,
    (v) =>
      (v.courses[0].modules[1].lessons[0].publication.visibility = "private"),
    (v) => (v.courses[0].slug = "../private"),
    (v) => (v.courses[0].privateTeacherNotes = "never ship"),
    (v) => (v.courses[0].modules[1].lessons[0].slug = "video"),
    (v) => (v.courses[0].modules[1].key = "fixture-module-one"),
    (v) => (v.courses[0].modules[1].position = 0),
    (v) =>
      (v.courses[0].modules[0].lessons[0].video.publicId =
        "https://bad.invalid"),
    (v) => (v.courses[0].modules[1].lessons[0].notesMarkdown = ""),
    (v) => (v.courses[0].modules = []),
  ]) {
    const value = publicCatalogueFixture();
    mutate(value);
    assert.throws(() => validatePublicCatalogue(value), /Public content:/);
  }
});
test("resource publication enforces local safe paths, review, type and truthful size", () => {
  const value = publicCatalogueFixture();
  const lesson = value.courses[0].modules[1].lessons[0];
  const resource = {
    key: "fixture-resource",
    title: "Test worksheet",
    url: "/resources/public/fixture.txt",
    type: "TXT",
    sizeBytes: 4,
    sha256: createHash("sha256").update("test").digest("hex"),
    publication: { ...lesson.publication },
  };
  for (const unsafe of [
    "https://bad.invalid/file.pdf",
    "//bad.invalid/file.pdf",
    "/resources/public/../private.pdf",
    "/resources/public/file.svg",
    "/resources/public/%2e%2e/private.pdf",
  ]) {
    lesson.resources = [{ ...resource, url: unsafe }];
    assert.throws(() => validatePublicCatalogue(value));
  }
  lesson.resources = [resource];
  assert.doesNotThrow(() => validatePublicCatalogue(value));
  const root = mkdtempSync(join(tmpdir(), "skyinnk-content-"));
  try {
    mkdirSync(join(root, "content"));
    mkdirSync(join(root, "public/resources/public"), { recursive: true });
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    assert.throws(() => checkPublicContent(root), /Missing or unsafe/);
    writeFileSync(join(root, "public/resources/public/fixture.txt"), "test");
    assert.doesNotThrow(() => checkPublicContent(root));
    const originalNotes = lesson.notesMarkdown;
    lesson.notesMarkdown = "[Read](/resources/public/%66ixture.txt#section)";
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    assert.doesNotThrow(() => checkPublicContent(root));
    lesson.notesMarkdown = "[Read](/resources/public/%6dissing.txt#section)";
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    assert.throws(() => checkPublicContent(root), /unreviewed resource: .*missing\.txt/);
    lesson.notesMarkdown = originalNotes;
    delete resource.sha256;
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    assert.throws(() => checkPublicContent(root), /Missing approved resource SHA-256/);
    resource.sha256 = createHash("sha256").update("test").digest("hex");
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    writeFileSync(join(root, "public/resources/public/fixture.txt"), "edit");
    assert.throws(() => checkPublicContent(root), /differs from approved bytes/);
    writeFileSync(join(root, "public/resources/public/fixture.txt"), "test");
    writeFileSync(
      join(root, "public/resources/public/private.txt"),
      "not approved",
    );
    assert.throws(() => checkPublicContent(root), /Unlisted file/);
    rmSync(join(root, "public/resources/public/private.txt"));
    writeFileSync(
      join(root, "public/resources/public/fixture.txt"),
      "modified",
    );
    assert.throws(() => checkPublicContent(root), /Incorrect resource size/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an approved digest cannot make text bytes a PDF", () => {
  const value = publicCatalogueFixture();
  const lesson = value.courses[0].modules[1].lessons[0];
  const contents = "Fictional text, not a PDF.";
  lesson.resources = [{
    key: "fixture-pdf",
    title: "Test worksheet",
    url: "/resources/public/fixture.pdf",
    type: "PDF",
    sizeBytes: Buffer.byteLength(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
    publication: { ...lesson.publication },
  }];
  const root = mkdtempSync(join(tmpdir(), "skyinnk-resource-format-"));
  try {
    mkdirSync(join(root, "content"));
    mkdirSync(join(root, "public/resources/public"), { recursive: true });
    writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
    writeFileSync(join(root, "public/resources/public/fixture.pdf"), contents);
    assert.throws(() => checkPublicContent(root), /Incorrect resource format/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("one reviewed resource can be reused across lessons but conflicting definitions fail", () => {
  const value = publicCatalogueFixture();
  const one = value.courses[0].modules[0].lessons[0],
    two = value.courses[0].modules[1].lessons[0];
  const resource = {
    key: "shared-resource",
    title: "Shared worksheet",
    url: "/resources/public/shared.txt",
    type: "TXT",
    sizeBytes: 4,
    publication: { ...one.publication },
  };
  one.resources = [resource];
  two.resources = [structuredClone(resource)];
  assert.doesNotThrow(() => validatePublicCatalogue(value));
  two.resources[0].title = "Conflicting worksheet";
  assert.throws(() => validatePublicCatalogue(value), /reused resource/);
});

test("mandatory catalogue build rejects unfinished or technically invalid notes on video and text lessons", () => {
  const value = publicCatalogueFixture();
  const root = mkdtempSync(join(tmpdir(), "skyinnk-final-notes-"));
  try {
    mkdirSync(join(root, "content"));
    const path = join(root, "content/catalogue.json");
    const check = () => {
      writeFileSync(path, JSON.stringify(value));
      return checkPublicContent(root);
    };
    const video = value.courses[0].modules[0].lessons[0];
    const text = value.courses[0].modules[1].lessons[0];
    for (const lesson of [video, text]) {
      const original = lesson.notesMarkdown;
      for (const [source, reason] of [
        ["## Notes\n\n**NOT EDUCATOR APPROVED**", /draft\/review warning/],
        ["## Notes\n\nEDITORIAL DRAFT", /draft\/review warning/],
        ["## Notes\n\nText\0here", /NUL character/],
        ["## Notes\n\n$\\definitelyUnknownCommand{x}$", /invalid parsed math/],
        ["## Notes\n\n$$\n\\definitelyUnknownCommand{x}\n$$", /invalid parsed math/],
      ]) {
        lesson.notesMarkdown = source;
        assert.throws(check, error =>
          reason.test(error.message) && error.message.includes("fixture-course/" + lesson.slug));
      }
      lesson.notesMarkdown = original;
    }
    video.notesMarkdown = "";
    text.notesMarkdown = "## Notes\n\n$x^2$\n\n~~~text\n$\\definitelyUnknownCommand{x}$\n~~~";
    assert.deepEqual(check(), value);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).courses[0].modules[1].lessons[0].notesMarkdown, text.notesMarkdown);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("mandatory catalogue build enforces actual rendered heading hierarchy", () => {
  const value = publicCatalogueFixture();
  const root = mkdtempSync(join(tmpdir(), "skyinnk-final-headings-"));
  try {
    mkdirSync(join(root, "content"));
    const path = join(root, "content/catalogue.json");
    const check = () => {
      writeFileSync(path, JSON.stringify(value));
      return checkPublicContent(root);
    };
    for (const module of value.courses[0].modules) {
      const lesson = module.lessons[0];
      const original = lesson.notesMarkdown;
      for (const source of [
        "# Duplicate page title\n\n## Notes",
        "Duplicate page title\n====================\n\n## Notes",
        "### First heading too deep\n\n## Notes",
        "## Notes\n\n#### Skipped level",
        "## Notes\n\n### Example\n\n# Another H1",
      ]) {
        lesson.notesMarkdown = source;
        assert.throws(check, error =>
          /rendered headings/.test(error.message) &&
          error.message.includes("fixture-course/" + lesson.slug));
      }
      for (const source of [
        "Heading-free prose remains valid.",
        "## Notes\n\n### Example\n\n## Summary",
        "Notes\n-----\n\n### Example",
        "Heading-free code example:\n\n~~~markdown\n# Literal heading\n~~~",
      ]) {
        lesson.notesMarkdown = source;
        assert.deepEqual(check(), value);
      }
      if (lesson.kind === "video") {
        lesson.notesMarkdown = "";
        assert.deepEqual(check(), value);
      }
      lesson.notesMarkdown = original;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication checks canonical absolute resource links alongside relative ones", () => {
  const value = publicCatalogueFixture();
  const lesson = value.courses[0].modules[1].lessons[0];
  lesson.resources = [{
    key: "fixture-resource", title: "Reviewed worksheet",
    url: "/resources/public/fixture.txt", type: "TXT", sizeBytes: 4,
    sha256: createHash("sha256").update("test").digest("hex"),
    publication: { ...lesson.publication },
  }];
  const root = mkdtempSync(join(tmpdir(), "skyinnk-canonical-resource-"));
  try {
    mkdirSync(join(root, "content"));
    mkdirSync(join(root, "public/resources/public"), { recursive: true });
    writeFileSync(join(root, "public/resources/public/fixture.txt"), "test");
    const check = (notes) => {
      lesson.notesMarkdown = notes;
      writeFileSync(join(root, "content/catalogue.json"), JSON.stringify(value));
      return checkPublicContent(root);
    };
    for (const notes of [
      "[Reviewed](https://www.skyinnk.in/resources/public/%66ixture.txt#section)",
      "[Reviewed](/resources/public/fixture.txt)",
      "[External](https://example.invalid/resources/public/missing.txt)",
    ]) assert.doesNotThrow(() => check(notes));
    for (const notes of [
      "[Missing](https://www.skyinnk.in/resources/public/missing.txt)",
      "[Missing](https://WWW.SKYINNK.IN:443/resources/public/%6dissing.txt#section)",
      "[Missing](/resources/public/missing.txt)",
    ]) assert.throws(() => check(notes), /unreviewed resource: .*missing\.txt/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
