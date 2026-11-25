import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "typescript";
import { focusMainContent } from "../app/utils/focus-main-content.ts";

function fakeMain(initialTabindex) {
  const attributes = new Map();
  if (initialTabindex !== undefined) attributes.set("tabindex", initialTabindex);
  const focusOptions = [];
  return {
    attributes,
    focusOptions,
    hasAttribute(key) { return attributes.has(key); },
    setAttribute(key, value) { attributes.set(key, value); },
    focus(options) { focusOptions.push(options); },
  };
}

test("global skip link makes an existing main landmark focusable and moves focus without scrolling", () => {
  const main = fakeMain();
  const doc = { getElementById: (id) => id === "main-content" ? main : null };
  assert.equal(focusMainContent(doc), true);
  assert.equal(main.attributes.get("tabindex"), "-1");
  assert.deepEqual(main.focusOptions, [{ preventScroll: true }]);
  assert.equal(focusMainContent(doc), true);
  assert.deepEqual(main.focusOptions, [{ preventScroll: true }, { preventScroll: true }]);
});

test("global skip link preserves existing tabindex and tolerates a missing landmark", () => {
  const main = fakeMain("0");
  assert.equal(focusMainContent({ getElementById: () => main }), true);
  assert.equal(main.attributes.get("tabindex"), "0");
  assert.deepEqual(main.focusOptions, [{ preventScroll: true }]);
  assert.equal(focusMainContent({ getElementById: () => null }), false);
});

test("real root Vue application SSR renders the native skip anchor and the target main landmark", async () => {
  const filename = "app/app.vue";
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
  runInNewContext(outputText, {
    module: mod,
    exports: mod.exports,
    require(id) {
      if (id.endsWith("/focus-main-content")) return { focusMainContent };
      return localRequire(id);
    },
    useHead() {},
  }, { filename });
  const app = createSSRApp(mod.exports.default);
  app.component("NuxtRouteAnnouncer", { render: () => null });
  app.component("NuxtPage", { render: () => h("main", { id: "main-content" }, "Fixture") });
  app.component("NuxtLink", {
    props: ["to"],
    setup: (props, { attrs, slots }) =>
      () => h("a", { href: props.to, ...attrs }, slots.default?.()),
  });
  const html = await renderToString(app);
  assert.match(html, /href="#main-content"[^>]*>Skip to content<\/a>/);
  assert.match(html, /id="main-content"/);
  assert.ok(html.includes('href="/privacy-policy"'));
  assert.ok(html.includes('href="/terms-of-service"'));
});
