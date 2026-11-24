import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "typescript";
import { courseSyllabusLinkLabels } from "../app/utils/course-link-labels.ts";

test("course link names remain concise unless displayed course titles collide", () => {
  const courses = [
    { title: "Science" }, { title: "Art" },
    { title: "Science" }, { title: "Science" },
  ];
  assert.deepEqual(courseSyllabusLinkLabels(courses), [
    "View syllabus: Science (course 1 of 3)",
    "View syllabus: Art",
    "View syllabus: Science (course 2 of 3)",
    "View syllabus: Science (course 3 of 3)",
  ]);
  assert.deepEqual(courseSyllabusLinkLabels([]), []);
  assert.deepEqual(courses.map((course) => course.title), [
    "Science", "Art", "Science", "Science",
  ]);
});

async function renderActualCatalogue(courses) {
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  const localRequire = createRequire(import.meta.url);
  let head;
  runInNewContext(outputText, {
    module: mod, exports: mod.exports,
    require(id) {
      if (id.endsWith("/public-catalogue")) return { listPublicCourses: () => courses };
      if (id.endsWith("/course-link-labels")) return { courseSyllabusLinkLabels };
      return localRequire(id);
    },
    useHead: (value) => { head = value; },
  }, { filename });
  const app = createSSRApp(mod.exports.default);
  app.component("NuxtLink", {
    props: ["to"],
    setup: (props, { attrs, slots }) =>
      () => h("a", { href: props.to, ...attrs }, slots.default?.()),
  });
  return { html: await renderToString(app), head };
}

test("actual Vue catalogue renders individually named same-title course links", async () => {
  const { html, head } = await renderActualCatalogue([
    { key: "physics-a", slug: "physics-a", title: "Physics", summary: "First topic" },
    { key: "history", slug: "history", title: "History", summary: "Second topic" },
    { key: "physics-b", slug: "physics-b", title: "Physics", summary: "Third topic" },
  ]);
  assert.ok(html.includes('aria-label="View syllabus: Physics (course 1 of 2)"'));
  assert.ok(html.includes('aria-label="View syllabus: Physics (course 2 of 2)"'));
  assert.ok(html.includes('aria-label="View syllabus: History"'));
  assert.equal((html.match(/>View syllabus<\/a>/g) ?? []).length, 3);
  assert.equal((html.match(/<h2>Physics<\/h2>/g) ?? []).length, 2);
  assert.ok(!html.includes("aria-label=\"View syllabus: History (course"));
  assert.ok(html.includes('href="/courses/physics-a"'));
  assert.ok(html.includes('href="/courses/physics-b"'));
  assert.ok(html.includes('href="/courses/history"'));
  assert.ok(head.link.some((item) => item.href === "https://www.skyinnk.in/courses"));
});

test("actual Vue catalogue preserves the honest no-publication empty state", async () => {
  const { html } = await renderActualCatalogue([]);
  assert.ok(html.includes("Lessons are being prepared"));
  assert.ok(html.includes("There are no published courses to browse yet."));
  assert.ok(!html.includes("View syllabus"));
});
