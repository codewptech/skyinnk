import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "@vue/compiler-sfc";
import { createSSRApp, h, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { useHead, useSeoMeta } from "@unhead/vue";
import { createHead, renderSSRHead } from "@unhead/vue/server";
import ts from "typescript";

// Compile actual components with the installed Vue toolchain. Nuxt's shell/link
// adapters are intentionally small; this is SSR rendering, not Nuxt hydration.
function evaluate(source, filename, globals) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      ...globals,
    },
    { filename },
  );
  return module.exports.default;
}

async function renderPage(page, user) {
  const globals = {
    useHead,
    useSeoMeta,
    useUser: () => ref(user),
    definePageMeta() {},
  };
  const component = (filename) => {
    const { descriptor, errors } = parse(
      readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"),
      { filename },
    );
    assert.deepEqual(errors, []);
    return evaluate(
      compileScript(descriptor, {
        id: filename,
        inlineTemplate: true,
        templateOptions: { ssr: true },
      }).content,
      filename,
      globals,
    );
  };
  const app = createSSRApp(component("app/app.vue"));
  app.component("NuxtPage", component(`app/pages/${page}.vue`));
  app.component("LegalPage", component("app/components/LegalPage.vue"));
  app.component("NuxtRouteAnnouncer", { render: () => null });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props, { slots }) =>
      () =>
        h("a", { href: props.to }, slots.default?.()),
  });
  const head = createHead();
  app.use(head);
  const html = await renderToString(app);
  return { html, ...(await renderSSRHead(head)) };
}

test("public home renders its login action and shared legal navigation without an account", async () => {
  const page = await renderPage("index");
  assert.match(page.html, /<h1[^>]*>Free lessons for curious school learners\.<\/h1>/);
  for (const path of ["/auth/login", "/privacy-policy", "/terms-of-service"])
    assert.ok(page.html.includes(`href="${path}"`));
  assert.ok(!page.html.includes('href="/auth/logout"'));
  assert.match(page.headTags, /<title>Skyinnk \| Free Learning for School Students<\/title>/);
  assert.match(page.htmlAttrs, /lang="en"/);
});

test("signed-in home escapes profile text and renders logout and safe image attributes", async () => {
  const page = await renderPage("index", {
    name: "<script>untrusted</script>",
    email: "user@example.invalid",
    picture: "https://example.invalid/avatar.png",
  });
  assert.ok(page.html.includes("&lt;script&gt;untrusted&lt;/script&gt;"));
  assert.ok(!page.html.includes("<script>untrusted</script>"));
  assert.ok(page.html.includes('href="/auth/logout"'));
  assert.ok(page.html.includes('referrerpolicy="no-referrer"'));
  assert.ok(!page.html.includes('href="/auth/login"'));
});

test("public legal pages render semantic content, home navigation and canonical metadata", async () => {
  for (const [route, title] of [
    ["privacy-policy", "Privacy Policy"],
    ["terms-of-service", "Terms of Service"],
  ]) {
    const page = await renderPage(route);
    assert.match(page.html, /<main\b/);
    assert.match(page.html, /<article\b/);
    assert.ok(page.html.includes(`>${title}</h1>`));
    assert.ok(page.html.includes('href="/"'));
    assert.ok(page.headTags.includes(`<title>${title} | Skyinnk</title>`));
    assert.ok(page.headTags.includes(`href="https://www.skyinnk.in/${route}"`));
    assert.match(page.headTags, /name="description"/);
    assert.match(page.htmlAttrs, /lang="en"/);
  }
});

test("analytics is opt-in, validates its public identifier and schedules only one credential-free startup", () => {
  const filename = "app/plugins/gtm.client.ts";
  const source = readFileSync(
    new URL(`../${filename}`, import.meta.url),
    "utf8",
  );
  for (const [analyticsEnabled, gtmId, active] of [
    [false, "GTM-TEST123", false],
    ["false", "GTM-TEST123", false],
    [true, "", false],
    [true, "invalid", false],
    ["true", "GTM-TEST123", true],
  ]) {
    const scripts = [];
    const window = {};
    const document = {
      getElementById: (id) => scripts.find((script) => script.id === id),
      createElement: (tag) => {
        assert.equal(tag, "script");
        return { dataset: {} };
      },
      head: { appendChild: (script) => scripts.push(script) },
    };
    const initialize = evaluate(source, filename, {
      defineNuxtPlugin: (setup) => setup,
      useRuntimeConfig: () => ({ public: { analyticsEnabled, gtmId } }),
      window,
      document,
    });
    initialize();
    initialize();
    assert.equal(scripts.length, active ? 1 : 0);
    if (!active) {
      assert.equal(window.dataLayer, undefined);
      continue;
    }
    assert.equal(
      scripts[0].src,
      "https://www.googletagmanager.com/gtm.js?id=GTM-TEST123",
    );
    assert.equal(scripts[0].async, true);
    assert.equal(scripts[0].dataset.cookieconsent, "ignore");
    assert.equal(window.dataLayer.length, 1);
    assert.deepEqual(Object.keys(window.dataLayer[0]).sort(), [
      "event",
      "gtm.start",
    ]);
    assert.equal(window.dataLayer[0].event, "gtm.js");
    assert.equal(typeof window.dataLayer[0]["gtm.start"], "number");
  }
});
