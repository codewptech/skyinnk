import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "typescript";
import { resourceActionNames } from "../app/utils/resource-action-names.ts";

test("repeated resource names get stable, unique labels, but distinct titles stay short", () => {
  const input = [
    { title: "Worksheet" }, { title: "Transcript" },
    { title: "Worksheet" }, { title: "Worksheet" },
  ];
  assert.deepEqual(resourceActionNames(input), [
    "Worksheet (resource 1 of 3)", "Transcript",
    "Worksheet (resource 2 of 3)", "Worksheet (resource 3 of 3)",
  ]);
  assert.deepEqual(resourceActionNames([]), []);
  assert.deepEqual(resourceActionNames([{ title: "Only resource" }]), ["Only resource"]);
  assert.deepEqual(input.map((item) => item.title), [
    "Worksheet", "Transcript", "Worksheet", "Worksheet",
  ]);
});

async function renderActualLesson() {
  const filename = "app/pages/courses/[courseSlug]/lessons/[lessonSlug].vue";
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
  const lesson = {
    key: "fixture-lesson", slug: "fixture-lesson", title: "Fixture text lesson",
    kind: "text", overview: "Fixture", notesMarkdown: "# Notes",
    resources: [
      { key: "file-one", title: "Worksheet", url: "/resources/public/one.txt", type: "TXT", sizeBytes: 7 },
      { key: "file-two", title: "Worksheet", url: "/resources/public/two.txt", type: "TXT", sizeBytes: 8 },
      { key: "file-three", title: "Reference", url: "/resources/public/three.txt", type: "TXT", sizeBytes: 9 },
    ],
  };
  const course = {
    slug: "fixture-course", title: "Fixture course", subject: "Test",
    modules: [{ key: "module", title: "Module", position: 0, lessons: [lesson] }],
  };
  const mod = { exports: {} };
  const localRequire = createRequire(import.meta.url);
  runInNewContext(outputText, {
    module: mod, exports: mod.exports,
    require(id) {
      if (id.endsWith("/public-catalogue")) return {
        findPublicLesson: (courseSlug, lessonSlug) =>
          courseSlug === course.slug && lessonSlug === lesson.slug
            ? { course, lesson } : undefined,
        orderedPublicLessons: () => [lesson],
      };
      if (id.endsWith("/resource-action-names")) return { resourceActionNames };
      if (id.endsWith("/Syllabus.vue")) return { default: { render: () => null } };
      return localRequire(id);
    },
    computed, watch, onMounted, onBeforeUnmount, nextTick,
    // Render the actual Resources tab through the same component template.
    ref: (value) => ref(value === "overview" ? "resources" : value),
    useRoute: () => ({ params: { courseSlug: course.slug, lessonSlug: lesson.slug } }),
    definePageMeta() {},
    onBeforeRouteUpdate() {},
    useHead() {},
    createError: ({ statusMessage }) => new Error(statusMessage),
  }, { filename });
  const app = createSSRApp(mod.exports.default);
  app.component("NuxtLink", {
    props: ["to"],
    setup: (props, { attrs, slots }) =>
      () => h("a", { href: props.to, ...attrs }, slots.default?.()),
  });
  app.component("MarkdownNotes", { render: () => h("p", "Fixture notes") });
  return renderToString(app);
}

test("real classroom resource tab distinguishes duplicate document actions without changing links", async () => {
  const html = await renderActualLesson();
  assert.equal((html.match(/Worksheet \(resource 1 of 2\)/g) ?? []).length, 2);
  assert.equal((html.match(/Worksheet \(resource 2 of 2\)/g) ?? []).length, 2);
  assert.equal((html.match(/Reference/g) ?? []).length >= 3, true);
  assert.ok(!html.includes("Reference (resource"));
  for (const path of ["one", "two", "three"]) {
    const href = 'href="/resources/public/' + path + '.txt"';
    assert.equal(html.split(href).length - 1, 2, "preview and download URLs stay intact");
  }
  assert.ok(html.includes("opens in a new tab"));
  assert.ok(html.includes("download"));
  assert.equal((html.match(/class="resource-actions"/g) ?? []).length, 3);
});

test("resource links with visually equivalent spacing and case receive distinct names", () => {
  assert.deepEqual(resourceActionNames([
    { title: " Worksheet " }, { title: "worksheet" },
    { title: "Work\t sheet" }, { title: "Summary" },
  ]), [
    "Worksheet (resource 1 of 2)",
    "worksheet (resource 2 of 2)",
    "Work\t sheet",
    "Summary",
  ]);
});

test("resource final names cannot collide with literal suffix-shaped titles", () => {
  const resources = ["Worksheet", "Worksheet", " worksheet (resource 1 of 2) ", "Worksheet (resource 2 of 2)", "Reference"].map(title => ({ title }));
  const labels = resourceActionNames(resources);
  const normalize = value => value.trim().replace(/\s+/gu, " ").toLowerCase();
  assert.equal(new Set(labels.map(normalize)).size, resources.length);
  assert.equal(labels[4], "Reference");
  assert.deepEqual(resourceActionNames(resources), labels);
  for (const [index, resource] of resources.entries())
    assert.ok(normalize(labels[index]).startsWith(normalize(resource.title)));
});
