import assert from "node:assert/strict";
import test from "node:test";
import { projectLearnerCourses } from "../shared/public-content.ts";
import { publicCatalogueFixture } from "./fixtures/public-catalogue.mjs";

test("learner catalogue explicitly projects reviewed source without approval metadata", () => {
  const fixture = publicCatalogueFixture();
  const lesson = fixture.courses[0].modules[0].lessons[0];
  lesson.resources = [{
    key: "reviewed-resource", title: "Fixture worksheet",
    url: "/resources/public/fixture.txt", type: "TXT", sizeBytes: 4,
    sha256: "a".repeat(64), publication: { ...lesson.publication },
  }];
  const before = structuredClone(fixture);
  const projected = projectLearnerCourses(fixture);
  assert.deepEqual(fixture, before);
  const course = projected[0];
  assert.deepEqual(Object.keys(course).sort(), ["audience", "key", "modules", "slug", "subject", "summary", "title"]);
  assert.deepEqual(Object.keys(course.modules[0]).sort(), ["key", "lessons", "position", "title"]);
  const rendered = course.modules[0].lessons[0];
  assert.equal(rendered.notesMarkdown, lesson.notesMarkdown);
  assert.deepEqual(rendered.video, lesson.video);
  assert.deepEqual(rendered.resources, [{ key: "reviewed-resource", title: "Fixture worksheet", url: "/resources/public/fixture.txt", type: "TXT", sizeBytes: 4 }]);
  for (const forbidden of ["publication", "reviewedBy", "reviewedAt", "sha256", lesson.publication.reviewedBy])
    assert.ok(!JSON.stringify(projected).includes(forbidden), forbidden);
  rendered.title = "Changed";
  assert.equal(lesson.title, before.courses[0].modules[0].lessons[0].title);
});

test("learner projection retains empty catalogue and rejects invalid approvals", () => {
  assert.deepEqual(projectLearnerCourses({ schemaVersion: 1, courses: [] }), []);
  for (const mutate of [
    (v) => { v.courses[0].publication.status = "draft"; },
    (v) => { delete v.courses[0].modules[0].lessons[0].publication.reviewedBy; },
    (v) => { v.courses[0].publication.reviewedAt = "2026-11-25T10:00"; },
    (v) => { v.courses[0].privateMemo = "not allowed"; },
  ]) {
    const fixture = publicCatalogueFixture();
    mutate(fixture);
    assert.throws(() => projectLearnerCourses(fixture), /Public content:/);
  }
});


test("publication rejects invalid Unicode scalar text even when escaped inside valid JSON", () => {
  const fields = [
    ["course title", v => [v.courses[0], "title"]],
    ["course summary", v => [v.courses[0], "summary"]],
    ["course audience", v => [v.courses[0], "audience"]],
    ["course subject", v => [v.courses[0], "subject"]],
    ["course reviewer", v => [v.courses[0].publication, "reviewedBy"]],
    ["module title", v => [v.courses[0].modules[0], "title"]],
    ["lesson title", v => [v.courses[0].modules[0].lessons[0], "title"]],
    ["lesson overview", v => [v.courses[0].modules[0].lessons[0], "overview"]],
    ["video notes", v => [v.courses[0].modules[0].lessons[0], "notesMarkdown"]],
    ["text notes", v => [v.courses[0].modules[1].lessons[0], "notesMarkdown"]],
    ["lesson reviewer", v => [v.courses[0].modules[0].lessons[0].publication, "reviewedBy"]],
    ["resource title", v => [v.courses[0].modules[0].lessons[0].resources[0], "title"]],
    ["resource reviewer", v => [v.courses[0].modules[0].lessons[0].resources[0].publication, "reviewedBy"]],
  ];
  for (const [name, field] of fields) {
    for (const invalid of ["\0", "\ud800", "\udc00"]) {
      const fixture = publicCatalogueFixture();
      const lesson = fixture.courses[0].modules[0].lessons[0];
      lesson.resources = [{
        key: "unicode-fixture-resource", title: "Fixture resource",
        url: "/resources/public/fixture.txt", type: "TXT", sizeBytes: 4,
        publication: { ...lesson.publication },
      }];
      const [object, key] = field(fixture);
      object[key] = "Fictional" + invalid + " text";
      const validBytes = Buffer.from(JSON.stringify(fixture));
      const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(validBytes));
      assert.throws(() => projectLearnerCourses(parsed), /NUL character|unpaired Unicode surrogate/, name + ": " + JSON.stringify(invalid));
    }
  }
});

test("publication preserves valid supplementary Unicode, multiline notes and empty video notes", () => {
  const fixture = publicCatalogueFixture();
  const course = fixture.courses[0];
  course.title = "गणित — café — 𝑥";
  course.publication.reviewedBy = "Fictional समीक्षक José 𐐀";
  const video = course.modules[0].lessons[0], text = course.modules[1].lessons[0];
  video.notesMarkdown = "";
  text.notesMarkdown = "## Notes\n\nगणित — café — 𝑥";
  const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(JSON.stringify(fixture))));
  const projected = projectLearnerCourses(parsed);
  assert.equal(projected[0].title, course.title);
  assert.equal(projected[0].modules[0].lessons[0].notesMarkdown, "");
  assert.equal(projected[0].modules[1].lessons[0].notesMarkdown, text.notesMarkdown);
});
