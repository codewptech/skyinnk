import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { releaseExpectations, copyFixtureSource } from "../scripts/released-catalogue-expectations.mjs";
import { publicCatalogueFixture } from "./fixtures/public-catalogue.mjs";

test("source expectations handle empty and reviewed nonempty catalogues", () => {
  assert.deepEqual(releaseExpectations({ schemaVersion: 1, courses: [] }), []);
  const source = publicCatalogueFixture();
  const course = source.courses[0];
  course.modules.reverse();
  const baseline = structuredClone(source);
  const [expected] = releaseExpectations(source);
  assert.deepEqual(source, baseline);
  assert.equal(expected.path, "/courses/fixture-course");
  assert.deepEqual(expected.lessons.map(lesson => lesson.slug), ["video", "text"]);
  assert.deepEqual(expected.lessons.map(lesson => lesson.kind), ["video", "text"]);
  assert.equal(expected.summary.lessonCount, 2);
  assert.ok(!JSON.stringify(expected).includes("reviewedBy"));
  course.publication.status = "draft";
  assert.throws(() => releaseExpectations(source), /Public content:/);
});

test("source expectations account for duplicate lesson titles and module ordering", () => {
  const source = publicCatalogueFixture();
  const course = source.courses[0];
  for (const module of course.modules) module.lessons[0].title = "Practice";
  const [expected] = releaseExpectations(source);
  assert.deepEqual(expected.lessons.map(lesson => lesson.linkName), [
    "Practice, First module (module 1, lesson 1)",
    "Practice, Second module (module 2, lesson 1)",
  ]);
});

test("isolated source copy cannot inherit existing reviewed resources or environment files", async () => {
  const root = await mkdtemp(join(tmpdir(), "skyinnk-copy-test-"));
  try {
    const source = join(root, "source");
    const target = join(root, "target");
    await mkdir(join(source, "public/resources/public"), { recursive: true });
    await mkdir(join(source, "content"), { recursive: true });
    await mkdir(join(source, "node_modules"), { recursive: true });
    await writeFile(join(source, "public/resources/public/reviewed.txt"), "synthetic source resource");
    await writeFile(join(source, "public/robots.txt"), "User-agent: *");
    await writeFile(join(source, "content/catalogue.json"), "{}");
    await writeFile(join(source, ".env"), "FICTIONAL=1");
    await copyFixtureSource(source, target);
    assert.deepEqual(await readdir(join(target, "public")), ["robots.txt"]);
    assert.equal(await readFile(join(target, "content/catalogue.json"), "utf8"), "{}");
    assert.equal(await readFile(join(source, "public/resources/public/reviewed.txt"), "utf8"), "synthetic source resource");
    for (const path of [".env", "node_modules", "public/resources"]) await assert.rejects(readdir(join(target, path)), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("release oracle predicts final collision-safe names for literal suffix-shaped titles", () => {
  const source = publicCatalogueFixture();
  const first = source.courses[0];
  first.title = "Practice";
  for (const module of first.modules) module.lessons[0].title = "Introduction";
  const template = structuredClone(first.modules[0].lessons[0]);
  first.modules[1].lessons.push(
    { ...template, key: "literal", slug: "literal", position: 1, title: "Introduction, First module (module 1, lesson 1)" },
    { ...template, key: "reserved", slug: "reserved", position: 2, title: "Introduction, First module (module 1, lesson 1) (link 2)" },
  );
  for (const [i, title] of ["Practice", "Practice (course 1 of 2)", "Practice (course 1 of 2) (link 2)"].entries()) {
    const course = structuredClone(first);
    course.key = course.slug = "course-" + i;
    course.title = title;
    course.modules.forEach((module, mi) => {
      module.key = "module-" + i + "-" + mi;
      module.lessons.forEach((lesson, li) => { lesson.key = "lesson-" + i + "-" + mi + "-" + li; });
    });
    source.courses.push(course);
  }
  const expected = releaseExpectations(source);
  assert.deepEqual(expected.map(course => course.linkName), [
    "View syllabus: Practice (course 1 of 2)",
    "View syllabus: Practice (course 2 of 2)",
    "View syllabus: Practice (course 1 of 2) (link 3)",
    "View syllabus: Practice (course 1 of 2) (link 2)",
  ]);
  assert.deepEqual(expected[0].lessons.map(lesson => lesson.linkName), [
    "Introduction, First module (module 1, lesson 1)",
    "Introduction, Second module (module 2, lesson 1)",
    "Introduction, First module (module 1, lesson 1) (link 3)",
    "Introduction, First module (module 1, lesson 1) (link 2)",
  ]);
});
