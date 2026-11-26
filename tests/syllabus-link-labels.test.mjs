import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { computed, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "typescript";
import { syllabusAccessibleNames } from "../app/utils/syllabus-link-labels.ts";

const lesson = (key, title, kind, position) => ({
  key,
  slug: key,
  title,
  kind,
  position,
});

test("syllabus retains its existing short names when links are unambiguous", () => {
  const labels = syllabusAccessibleNames([
    {
      key: "module-a",
      title: "Module one",
      position: 0,
      lessons: [
        lesson("video", "Foundations", "video", 0),
        lesson("text", "Practice", "text", 1),
        lesson("different-kind", "Foundations", "text", 2),
      ],
    },
  ]);

  assert.equal(labels.get("video"), "Foundations, Video lesson");
  assert.equal(labels.get("text"), "Practice, Text lesson");
  assert.equal(labels.get("different-kind"), "Foundations, Text lesson");
  assert.equal(labels.size, 3);
});

test("identical lesson titles and kinds have distinct module-aware accessible names", () => {
  const labels = syllabusAccessibleNames([
    {
      key: "module-later",
      title: "Repeated module",
      position: 10,
      lessons: [
        lesson("third", "Introduction", "text", 0),
      ],
    },
    {
      key: "module-first",
      title: "Repeated module",
      position: 2,
      lessons: [
        lesson("second", "Introduction", "text", 5),
        lesson("first", "Introduction", "text", 0),
      ],
    },
  ]);

  assert.equal(
    labels.get("first"),
    "Introduction, Repeated module (module 1, lesson 1), Text lesson",
  );
  assert.equal(
    labels.get("second"),
    "Introduction, Repeated module (module 1, lesson 2), Text lesson",
  );
  assert.equal(
    labels.get("third"),
    "Introduction, Repeated module (module 2, lesson 1), Text lesson",
  );
  assert.equal(new Set(labels.values()).size, 3);
  assert.equal(labels.size, 3);
});

test("syllabus labels stay stable when the caller supplies modules in a different order", () => {
  const modules = [
    {
      key: "later",
      title: "Second",
      position: 8,
      lessons: [lesson("later-lesson", "Overview", "text", 0)],
    },
    {
      key: "earlier",
      title: "First",
      position: 0,
      lessons: [lesson("earlier-lesson", "Overview", "text", 0)],
    },
  ];
  assert.deepEqual(
    [...syllabusAccessibleNames(modules)],
    [...syllabusAccessibleNames([...modules].reverse())],
  );
});

// Exercise the actual Vue component, not just the extracted label helper.
// This protects the binding from being dropped during a future UI refactor.
test("real classroom syllabus component renders distinct accessible link names and unchanged URLs", async () => {
  const filename = "app/components/classroom/Syllabus.vue";
  const { descriptor, errors } = parse(
    readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"),
    { filename },
  );
  assert.deepEqual(errors, []);
  const source = compileScript(descriptor, {
    id: filename,
    inlineTemplate: true,
    templateOptions: { ssr: true },
  }).content;
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const compiled = { exports: {} };
  const localRequire = createRequire(import.meta.url);
  runInNewContext(
    outputText,
    {
      module: compiled,
      exports: compiled.exports,
      computed,
      require(id) {
        return id.endsWith("/syllabus-link-labels")
          ? { syllabusAccessibleNames }
          : localRequire(id);
      },
    },
    { filename },
  );

  const app = createSSRApp(compiled.exports.default, {
    courseSlug: "fixture-course",
    lessonKey: "intro-a",
    modules: [
      {
        key: "module-a",
        title: "Getting started",
        position: 0,
        lessons: [
          lesson("intro-a", "Introduction", "text", 0),
          lesson("video", "Introduction", "video", 1),
        ],
      },
      {
        key: "module-b",
        title: "Further learning",
        position: 1,
        lessons: [lesson("intro-b", "Introduction", "text", 0)],
      },
    ],
  });
  app.component("NuxtLink", {
    props: ["to"],
    setup: (props, { attrs, slots }) =>
      () => h("a", { href: props.to, ...attrs }, slots.default?.()),
  });
  const html = await renderToString(app);
  assert.match(
    html,
    /aria-label="Introduction, Getting started \(module 1, lesson 1\), Text lesson"/,
  );
  assert.match(
    html,
    /aria-label="Introduction, Further learning \(module 2, lesson 1\), Text lesson"/,
  );
  assert.match(html, /aria-label="Introduction, Video lesson"/);
  assert.match(html, /href="\/courses\/fixture-course\/lessons\/intro-a"/);
  assert.match(html, /href="\/courses\/fixture-course\/lessons\/intro-b"/);
  assert.match(html, /href="\/courses\/fixture-course\/lessons\/video"/);
  assert.match(html, /aria-current="page"/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 3);
});

test("visually equivalent syllabus names receive distinct positions, while different lesson kinds remain concise", () => {
  const labels = syllabusAccessibleNames([
    { key: "module-a", title: "Unit", position: 0, lessons: [
      lesson("a", "Introduction", "text", 0),
      lesson("b", "  introduction  ", "text", 1),
      lesson("c", "INTRODUCTION", "video", 2),
    ] },
  ]);
  assert.equal(labels.get("a"), "Introduction, Unit (module 1, lesson 1), Text lesson");
  assert.equal(labels.get("b"), "introduction, Unit (module 1, lesson 2), Text lesson");
  assert.equal(labels.get("c"), "INTRODUCTION, Video lesson");
  assert.equal(new Set(labels.values()).size, 3);
});

test("syllabus final names cannot collide with literal module-position-shaped titles", () => {
  const modules = [{ key: "unit", title: "Unit", position: 0, lessons: [
    lesson("a", "Introduction", "text", 0),
    lesson("b", "Introduction", "text", 1),
    lesson("c", " introduction, unit (module 1, lesson 1) ", "text", 2),
    lesson("d", "Introduction, Unit (module 1, lesson 2)", "text", 3),
    lesson("e", "Practice", "video", 4),
  ] }];
  const labels = syllabusAccessibleNames(modules);
  const normalize = value => value.trim().replace(/\s+/gu, " ").toLowerCase();
  assert.equal(new Set([...labels.values()].map(normalize)).size, 5);
  assert.equal(labels.get("e"), "Practice, Video lesson");
  assert.deepEqual([...syllabusAccessibleNames(modules)], [...labels]);
  for (const item of modules[0].lessons)
    assert.ok(normalize(labels.get(item.key)).startsWith(normalize(item.title)));
});
