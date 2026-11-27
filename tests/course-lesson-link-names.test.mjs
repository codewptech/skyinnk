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

const fixtureCourse = {
  key: "fixture-course",
  slug: "fixture-course",
  title: "Fictional lesson course",
  summary: "Test-only content",
  audience: "Fixture students",
  modules: [
    {
      key: "later-module",
      title: "Same module title",
      position: 2,
      lessons: [
        { key: "third", slug: "third", title: "Introduction", position: 0 },
      ],
    },
    {
      key: "first-module",
      title: "Same module title",
      position: 0,
      lessons: [
        { key: "second", slug: "second", title: "Introduction", position: 4 },
        { key: "first", slug: "first", title: "Introduction", position: 0 },
        { key: "unique", slug: "unique", title: "Practice", position: 6 },
      ],
    },
  ],
};

async function renderCourse(slug, selectedCourse = fixtureCourse) {
  const filename = "app/pages/courses/[courseSlug]/index.vue";
  const { descriptor, errors } = parse(
    readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"),
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
  let pageHead;
  runInNewContext(
    outputText,
    {
      module: mod,
      exports: mod.exports,
      require(id) {
        if (id.endsWith("/unique-accessible-names"))
          return { uniqueAccessibleNames };
        if (id.endsWith("/public-catalogue"))
          return {
            findPublicCourse: (requested) =>
              requested === selectedCourse.slug ? selectedCourse : undefined,
          };
        return localRequire(id);
      },
      useRoute: () => ({ params: { courseSlug: slug } }),
      definePageMeta() {},
      useHead: (head) => {
        pageHead = head;
      },
      createError: ({ statusMessage }) => new Error(statusMessage),
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
  return { html: await renderToString(app), pageHead };
}

test("course syllabus links have unique names for repeated titles without changing destinations", async () => {
  const { html, pageHead } = await renderCourse("fixture-course");
  for (const [label, slug] of [
    ["Introduction, Same module title (module 1, lesson 1)", "first"],
    ["Introduction, Same module title (module 1, lesson 2)", "second"],
    ["Introduction, Same module title (module 2, lesson 1)", "third"],
  ]) {
    assert.ok(
      html.includes(`aria-label="${label}"`),
      `missing distinct accessible name: ${label}`,
    );
    assert.ok(html.includes(`href="/courses/fixture-course/lessons/${slug}"`));
  }
  assert.equal((html.match(/aria-label="Introduction, /g) ?? []).length, 3);
  assert.equal((html.match(/>Introduction<\/a>/g) ?? []).length, 3);
  assert.ok(html.includes('href="/courses/fixture-course/lessons/unique"'));
  assert.ok(html.includes(">Practice</a>"));
  assert.ok(!html.includes('aria-label="Practice'));
  assert.ok(
    html.indexOf("lessons/first") < html.indexOf("lessons/second") &&
      html.indexOf("lessons/second") < html.indexOf("lessons/third"),
    "lesson order must match displayed module and lesson position",
  );
  assert.equal(pageHead.title, "Fictional lesson course | Skyinnk");
  assert.ok(
    pageHead.link.some(
      (item) =>
        item.rel === "canonical" &&
        item.href === "https://www.skyinnk.in/courses/fixture-course",
    ),
  );
});

test("unknown course remains unavailable without rendering an accidental page", async () => {
  await assert.rejects(renderCourse("unpublished"), /Course not published/);
});

test("real rendered course page separates visually identical lesson names with case/spacing variants", async () => {
  const variant = structuredClone(fixtureCourse);
  // First module has two different published lesson destinations.
  variant.modules[1].lessons[0].title = "  introduction  ";
  const { html } = await renderCourse("fixture-course", variant);
  assert.ok(
    html.includes(
      'aria-label="Introduction, Same module title (module 1, lesson 1)"',
    ),
  );
  assert.ok(
    html.includes(
      'aria-label="introduction, Same module title (module 1, lesson 2)"',
    ),
  );
  assert.ok(
    html.includes(
      'aria-label="Introduction, Same module title (module 2, lesson 1)"',
    ),
  );
  assert.equal(
    (html.match(/aria-label="(?:Introduction|introduction), /g) ?? []).length,
    3,
  );
  for (const slug of ["first", "second", "third"]) {
    assert.ok(
      html.includes('href="/courses/fixture-course/lessons/' + slug + '"'),
    );
  }
});

test("actual course page resolves collisions between literal and generated lesson link names", async () => {
  const fixture = structuredClone(fixtureCourse);
  fixture.modules[1].lessons.push({
    key: "literal",
    slug: "literal",
    position: 9,
    title: " introduction, same module title (module 1, lesson 1) ",
  });
  const { html } = await renderCourse(fixture.slug, fixture);
  const normalize = (value) => value.trim().replace(/\s+/gu, " ").toLowerCase();
  const links = [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].filter(
    (match) => match[1].includes("/lessons/"),
  );
  const names = links.map(
    (match) => match[1].match(/aria-label="([^"]+)"/)?.[1] ?? match[2],
  );
  assert.equal(names.length, 5);
  assert.equal(new Set(names.map(normalize)).size, 5);
  assert.ok(names.includes("Practice"));
  for (const slug of ["first", "second", "third", "literal", "unique"])
    assert.ok(
      html.includes('href="/courses/fixture-course/lessons/' + slug + '"'),
    );
});

test("actual course page names canonically equivalent titles distinctly without altering their visible text", async () => {
  const fixture = structuredClone(fixtureCourse);
  const first = fixture.modules[1].lessons.find((x) => x.key === "first");
  const second = fixture.modules[1].lessons.find((x) => x.key === "second");
  first.title = "Café";
  second.title = "Cafe\u0301";
  const { html } = await renderCourse(fixture.slug, fixture);
  assert.ok(
    html.includes('aria-label="Café, Same module title (module 1, lesson 1)"'),
  );
  assert.ok(
    html.includes(
      'aria-label="Cafe\u0301, Same module title (module 1, lesson 2)"',
    ),
  );
  assert.ok(html.includes(">Café</a>") && html.includes(">Cafe\u0301</a>"));
  assert.ok(html.includes('href="/courses/fixture-course/lessons/first"'));
  assert.ok(html.includes('href="/courses/fixture-course/lessons/second"'));
});
