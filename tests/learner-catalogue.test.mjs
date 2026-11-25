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
