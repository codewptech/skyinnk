import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  listPublicCourseSummaries,
  readPublicCourseOutline,
  readPublicLesson,
} from "../server/utils/public-course-read.ts";
import { publicCatalogueFixture } from "./fixtures/public-catalogue.mjs";

test("live V1 publication manifest provides no fictional public course API results", () => {
  const manifest = JSON.parse(readFileSync(new URL("../content/catalogue.json", import.meta.url), "utf8"));
  assert.deepEqual(listPublicCourseSummaries(manifest.courses), { courses: [] });
  assert.equal(readPublicCourseOutline(manifest.courses, "not-released"), undefined);
  assert.equal(readPublicLesson(manifest.courses, "not-released", "not-released"), undefined);
});

test("public course API lists explicit summary fields without notes, media, review metadata or user data", () => {
  const value = publicCatalogueFixture();
  const data = listPublicCourseSummaries(value.courses);
  assert.equal(data.courses.length, 1);
  assert.deepEqual(Object.keys(data.courses[0]).sort(), [
    "audience", "key", "lessonCount", "moduleCount", "slug", "subject", "summary", "title",
  ]);
  assert.equal(data.courses[0].moduleCount, 2);
  assert.equal(data.courses[0].lessonCount, 2);
  assert.ok(!JSON.stringify(data).includes("notesMarkdown"));
  assert.ok(!JSON.stringify(data).includes("reviewedBy"));
});

test("outline uses stable source keys and sorted module/lesson order without notes or videos", () => {
  const input = publicCatalogueFixture().courses;
  input[0].modules.reverse();
  const originalOrder = input[0].modules.map((x) => x.key);
  const data = readPublicCourseOutline(input, input[0].slug);
  assert.ok(data);
  assert.deepEqual(data.course.modules.map((x) => x.position), [0, 1]);
  assert.deepEqual(input[0].modules.map((x) => x.key), originalOrder);
  assert.equal(data.course.key, input[0].key);
  assert.ok(!JSON.stringify(data).includes("notesMarkdown"));
  assert.ok(!JSON.stringify(data).includes("publicId"));
  assert.ok(!JSON.stringify(data).includes("publication"));
});

test("released lesson exposes only published public notes and approved media metadata", () => {
  const input = publicCatalogueFixture().courses;
  const module = input[0].modules[0];
  const lesson = module.lessons[0];
  const value = readPublicLesson(input, input[0].slug, lesson.slug);
  assert.equal(value?.course.key, input[0].key);
  assert.equal(value?.module.key, module.key);
  assert.equal(value?.lesson.key, lesson.key);
  assert.equal(value?.lesson.notesMarkdown, lesson.notesMarkdown);
  assert.equal(value?.lesson.kind, lesson.kind);
  assert.deepEqual(Object.keys(value.lesson).sort(), [
    "key", "kind", "notesMarkdown", "overview", "position", "resources",
    "slug", "title", "video",
  ]);
  assert.ok(!JSON.stringify(value).includes("reviewedBy"));
  assert.ok(!JSON.stringify(value).includes("auth0Id"));
});

test("unknown, invalid, unpublished and traversal-like course/lesson routes are absent", () => {
  const input = publicCatalogueFixture().courses;
  const slug = input[0].slug;
  for (const invalid of ["", "../private", "%2e%2e", "unknown-course", "UPPER"]) {
    assert.equal(readPublicCourseOutline(input, invalid), undefined);
    assert.equal(readPublicLesson(input, invalid, "video"), undefined);
    assert.equal(readPublicLesson(input, slug, invalid), undefined);
  }
});

test("drafts, hidden or unreviewed lessons and unsupported fields fail closed", () => {
  for (const mutate of [
    (v) => { v.courses[0].publication.status = "draft"; },
    (v) => { v.courses[0].modules[0].lessons[0].publication.visibility = "private"; },
    (v) => { delete v.courses[0].modules[0].lessons[0].publication.reviewedBy; },
    (v) => { v.courses[0].teacherPrivateMemo = "do not expose"; },
  ]) {
    const value = publicCatalogueFixture();
    mutate(value);
    assert.throws(() => listPublicCourseSummaries(value.courses), /Public content:/);
    assert.throws(() => readPublicCourseOutline(value.courses, value.courses[0].slug), /Public content:/);
    assert.throws(() => readPublicLesson(value.courses, value.courses[0].slug, "video"), /Public content:/);
  }
});

test("released public resource response contains safe, explicitly selected fields only", () => {
  const input = publicCatalogueFixture().courses;
  const lesson = input[0].modules[0].lessons[0];
  lesson.resources = [{
    key: "shared-public-worksheet",
    title: "Worksheet",
    url: "/resources/public/worksheet.pdf",
    type: "PDF",
    sizeBytes: 10,
    publication: { ...lesson.publication },
  }];
  const data = readPublicLesson(input, input[0].slug, lesson.slug);
  assert.deepEqual(data?.lesson.resources, [{
    key: "shared-public-worksheet",
    title: "Worksheet",
    url: "/resources/public/worksheet.pdf",
    type: "PDF",
    sizeBytes: 10,
  }]);
  assert.ok(!JSON.stringify(data).includes("publication"));
});

test("read-only projections never mutate the validated source manifest", () => {
  const value = publicCatalogueFixture();
  const original = structuredClone(value);
  const course = value.courses[0];
  listPublicCourseSummaries(value.courses);
  readPublicCourseOutline(value.courses, course.slug);
  readPublicLesson(value.courses, course.slug, course.modules[0].lessons[0].slug);
  assert.deepEqual(value, original);
});
