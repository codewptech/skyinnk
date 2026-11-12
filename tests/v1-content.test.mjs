import assert from "node:assert/strict";
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
