import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "typescript";
import { uniqueAccessibleNames } from "../app/utils/unique-accessible-names.ts";
import { courseSyllabusLinkLabels } from "../app/utils/course-link-labels.ts";

test("course link names remain concise unless displayed course titles collide", () => {
  const courses = [
    { title: "Science" },
    { title: "Art" },
    { title: "Science" },
    { title: "Science" },
  ];
  assert.deepEqual(courseSyllabusLinkLabels(courses), [
    "View syllabus: Science (course 1 of 3)",
    "View syllabus: Art",
    "View syllabus: Science (course 2 of 3)",
    "View syllabus: Science (course 3 of 3)",
  ]);
  assert.deepEqual(courseSyllabusLinkLabels([]), []);
  assert.deepEqual(
    courses.map((course) => course.title),
    ["Science", "Art", "Science", "Science"],
  );
});

async function renderActualCatalogue(courses, demoPreview = false) {
  const filename = "app/pages/courses/index.vue";
  const { descriptor, errors } = parse(
    readFileSync(new URL("../" + filename, import.meta.url), "utf8"),
    { filename },
  );
  assert.deepEqual(errors, []);
  const compiled = compileScript(descriptor, {
    id: filename,
    inlineTemplate: true,
    templateOptions: { ssr: true },
  });
  const { outputText } = ts.transpileModule(compiled.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  const localRequire = createRequire(import.meta.url);
  let head;
  runInNewContext(
    outputText,
    {
      module: mod,
      exports: mod.exports,
      require(id) {
        if (id.endsWith("/public-catalogue"))
          return { useLearningCatalogue: async () => ({ data: { value: { enabled: demoPreview, courses } }, error: { value: null } }) };
        if (id.endsWith("/course-link-labels"))
          return { courseSyllabusLinkLabels };
        return localRequire(id);
      },
      useHead: (value) => {
        head = value;
      },
    },
    { filename },
  );
  const app = createSSRApp(mod.exports.default);
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props, { attrs, slots }) =>
      () =>
        h("a", { href: props.to, ...attrs }, slots.default?.()),
  });
  return { html: await renderToString(app), head };
}

test("actual Vue catalogue renders individually named same-title course links", async () => {
  const { html, head } = await renderActualCatalogue([
    {
      key: "physics-a",
      slug: "physics-a",
      title: "Physics",
      summary: "First topic",
    },
    {
      key: "history",
      slug: "history",
      title: "History",
      summary: "Second topic",
    },
    {
      key: "physics-b",
      slug: "physics-b",
      title: "Physics",
      summary: "Third topic",
    },
  ]);
  assert.ok(
    html.includes('aria-label="View syllabus: Physics (course 1 of 2)"'),
  );
  assert.ok(
    html.includes('aria-label="View syllabus: Physics (course 2 of 2)"'),
  );
  assert.ok(html.includes('aria-label="View syllabus: History"'));
  assert.equal(
    (html.match(/href="\/courses\/(?:physics-a|history|physics-b)"/g) ?? [])
      .length,
    3,
  );
  assert.ok(html.includes("First topic") && html.includes("Third topic"));
  assert.ok(!html.includes('aria-label="View syllabus: History (course'));
  assert.ok(html.includes('href="/courses/physics-a"'));
  assert.ok(html.includes('href="/courses/physics-b"'));
  assert.ok(html.includes('href="/courses/history"'));
  assert.ok(
    head.link.some((item) => item.href === "https://www.skyinnk.in/courses"),
  );
});

test("actual Vue catalogue preserves the honest no-publication empty state", async () => {
  const { html } = await renderActualCatalogue([]);
  assert.ok(html.includes("Lessons are being prepared"));
  assert.ok(html.includes("There are no published courses to browse yet."));
  assert.ok(!html.includes("View syllabus"));
});

test("course names that differ only in casing or whitespace are disambiguated", () => {
  assert.deepEqual(
    courseSyllabusLinkLabels([
      { title: " Physics 101 " },
      { title: "physics   101" },
      { title: "Biology" },
    ]),
    [
      "View syllabus: Physics 101 (course 1 of 2)",
      "View syllabus: physics 101 (course 2 of 2)",
      "View syllabus: Biology",
    ],
  );
});

test("catalogue final names cannot collide with literal suffix-shaped titles", async () => {
  const titles = [
    "Science",
    "Science",
    " science (course 1 of 2) ",
    "Science (course 2 of 2)",
    "Art",
  ];
  const courses = titles.map((title, index) => ({
    title,
    key: "course-" + index,
    slug: "course-" + index,
    summary: "Fixture",
  }));
  const labels = courseSyllabusLinkLabels(courses);
  const normalize = (value) => value.trim().replace(/\s+/gu, " ").toLowerCase();
  assert.equal(new Set(labels.map(normalize)).size, courses.length);
  assert.equal(labels[4], "View syllabus: Art");
  assert.deepEqual(courseSyllabusLinkLabels(courses), labels);
  for (const [index, title] of titles.entries())
    assert.ok(
      normalize(labels[index]).startsWith(normalize("View syllabus: " + title)),
    );
  const { html } = await renderActualCatalogue(courses);
  const actual = [...html.matchAll(/aria-label="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(actual, labels);
  for (const course of courses)
    assert.ok(html.includes('href="/courses/' + course.slug + '"'));
});

test("final-name fallback reserves literal suffixes and handles repeated collisions", () => {
  const input = [
    "Name",
    " name ",
    "Name (link 2)",
    "NAME",
    "name (link 3)",
    "Independent",
  ];
  const result = uniqueAccessibleNames(input);
  assert.deepEqual(result, [
    "Name",
    "name (link 4)",
    "Name (link 2)",
    "NAME (link 5)",
    "name (link 3)",
    "Independent",
  ]);
  assert.deepEqual(uniqueAccessibleNames(result), result);
  assert.deepEqual(uniqueAccessibleNames([]), []);
});

test("accessible course, syllabus and resource labels distinguish canonically equivalent Unicode titles", async () => {
  const { resourceActionNames } =
    await import("../app/utils/resource-action-names.ts");
  const { syllabusAccessibleNames } =
    await import("../app/utils/syllabus-link-labels.ts");
  for (const pair of [
    ["Café", "Cafe\u0301"],
    ["\u0958", "\u0915\u093c"],
  ]) {
    const [a, b] = pair;
    const titles = pair.map((title) => ({ title }));
    assert.equal(a.normalize("NFC"), b.normalize("NFC"));
    assert.deepEqual(courseSyllabusLinkLabels(titles), [
      "View syllabus: " + a + " (course 1 of 2)",
      "View syllabus: " + b + " (course 2 of 2)",
    ]);
    assert.deepEqual(resourceActionNames(titles), [
      a + " (resource 1 of 2)",
      b + " (resource 2 of 2)",
    ]);
    const labels = syllabusAccessibleNames([
      {
        key: "unit",
        title: "Unit",
        position: 0,
        lessons: pair.map((title, position) => ({
          key: "lesson-" + position,
          slug: "lesson-" + position,
          title,
          kind: "text",
          position,
        })),
      },
    ]);
    assert.deepEqual(
      [...labels.values()],
      [
        a + ", Unit (module 1, lesson 1), Text lesson",
        b + ", Unit (module 1, lesson 2), Text lesson",
      ],
    );
    const result = uniqueAccessibleNames([a, b, a + " (link 2)"]);
    assert.deepEqual(result, [a, b + " (link 3)", a + " (link 2)"]);
    assert.deepEqual(uniqueAccessibleNames(result), result);
    assert.deepEqual(
      titles.map((x) => x.title),
      pair,
    );
  }
});


test("demo catalogue renders database preview labels rather than published claims", async () => {
  const { html } = await renderActualCatalogue([{ key: "demo-sample", slug: "demo-sample", title: "[DEMO] Sample", summary: "Fictional" }], true);
  assert.ok(html.includes("Development preview"));
  assert.ok(html.includes("Demo course"));
  assert.ok(html.includes('href="/courses/demo-sample"'));
  assert.ok(!html.includes("Published learning material is available without registration."));
  assert.ok(!html.includes(">Public course<"));
});
