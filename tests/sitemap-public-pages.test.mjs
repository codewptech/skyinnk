import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const fixtureCourses = [
  {
    slug: "course-one",
    modules: [
      { position: 0, lessons: [
        { position: 0, slug: "video-lesson" },
        { position: 1, slug: "text-lesson" },
      ] },
    ],
  },
  {
    slug: "course-two",
    modules: [{ position: 0, lessons: [{ position: 0, slug: "chapter-one" }] }],
  },
];

function executeActualSitemap(courses) {
  const filename = "server/routes/sitemap.xml.get.ts";
  const source = readFileSync(new URL("../" + filename, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} };
  const localRequire = createRequire(import.meta.url);
  runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(specifier) {
      if (specifier.endsWith("/utils/public-catalogue-source.ts")) return {
        listSourceCourses: () => courses,
      };
      return localRequire(specifier);
    },
    defineEventHandler: (callback) => callback,
    setHeader: (event, name, value) => { event.headers[name] = value; },
  }, { filename });

  const event = { headers: {} };
  const xml = module.exports.default(event);
  return { xml, headers: event.headers };
}

function urls(xml) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

test("actual sitemap handler includes both canonical public legal routes and only published lesson paths", () => {
  const { xml, headers } = executeActualSitemap(fixtureCourses);
  const base = "https://www.skyinnk.in";
  assert.equal(headers["Content-Type"], "application/xml; charset=utf-8");
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.endsWith("</urlset>"));

  const actual = urls(xml);
  assert.deepEqual(actual, [
    base + "/",
    base + "/courses",
    base + "/privacy-policy",
    base + "/terms-of-service",
    base + "/courses/course-one",
    base + "/courses/course-one/lessons/video-lesson",
    base + "/courses/course-one/lessons/text-lesson",
    base + "/courses/course-two",
    base + "/courses/course-two/lessons/chapter-one",
  ]);
  assert.equal(new Set(actual).size, actual.length, "no duplicate indexed URL");
  assert.ok(!actual.some((url) =>
    /\/auth\/|\/api\/|\/resources\/|\/admin\/|\/account\/|\/draft\//.test(url)));
});

test("empty real-publication sitemap retains the legal and discovery URLs but invents no teaching content", () => {
  const { xml } = executeActualSitemap([]);
  assert.deepEqual(urls(xml), [
    "https://www.skyinnk.in/",
    "https://www.skyinnk.in/courses",
    "https://www.skyinnk.in/privacy-policy",
    "https://www.skyinnk.in/terms-of-service",
  ]);
  assert.doesNotMatch(xml, /<script|<iframe|<img/);
});
