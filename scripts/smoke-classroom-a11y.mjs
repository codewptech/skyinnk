// Start the fictional preview with smoke-v1.mjs --isolated-fixture --serve-fixture --http-only.
// Run this check against that local preview: node scripts/smoke-classroom-a11y.mjs http://127.0.0.1:4319
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:4319");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch (error) {
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!modules) throw error;
  playwright = require(join(modules, "playwright"));
}
const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === base.origin
      ? route.continue()
      : route.abort(),
  );
  const lesson = "/courses/fixture-course/lessons/video-test";
  const next = "/courses/fixture-course/lessons/text-test";
  await page.goto(new URL(lesson, base).href);
  await page.getByRole("heading", { name: "Fixture video lesson", level: 1 }).waitFor();
  const relationships = await page.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      return panel?.getAttribute("role") === "tabpanel" &&
        panel.getAttribute("aria-labelledby") === tab.id &&
        panel.hidden === (tab.getAttribute("aria-selected") !== "true");
    }),
  );
  assert.deepEqual(relationships, [true, true, true]);
  const focus = (node) => node === document.activeElement;
  const overview = page.getByRole("tab", { name: "Overview" });
  const notes = page.getByRole("tab", { name: "Notes" });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await notes.evaluate(focus), true);
  await page.getByRole("tabpanel").getByText("Fixture notes marker").waitFor();
  await page.keyboard.press("End");
  const resources = page.getByRole("tab", { name: "Resources" });
  assert.equal(await resources.evaluate(focus), true);
  await page.getByRole("tabpanel").getByRole("link", { name: /download/i }).waitFor();
  await page.keyboard.press("Home");
  assert.equal(await overview.evaluate(focus), true);

  const mobile = page.getByRole("button", { name: "Course syllabus", exact: true });
  const dialog = page.getByRole("dialog");
  await mobile.click();
  await dialog.waitFor();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.classList.contains("mobile-toggle"));
  await mobile.click();
  await dialog.waitFor();
  await page.setViewportSize({ width: 1365, height: 900 });
  await dialog.waitFor({ state: "hidden", timeout: 3000 });
  await page.waitForFunction(() => document.activeElement?.classList.contains("desktop-toggle"));

  const nextLesson = page.getByRole("link", { name: /next lesson/i });
  await nextLesson.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(new URL(next, base).href);
  await page.getByRole("heading", { name: "Fixture text lesson", level: 1 }).waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "lesson-title");
  assert.equal(await resources.count(), 0);
  assert.equal(await overview.getAttribute("aria-selected"), "true");
  await page.goBack();
  await page.waitForURL(new URL(lesson, base).href);
  await resources.waitFor();
  assert.equal(await overview.getAttribute("aria-selected"), "true");
  await page.setViewportSize({ width: 375, height: 812 });
  await mobile.click();
  await dialog.getByRole("link", { name: "Fixture text lesson" }).click();
  await page.waitForURL(new URL(next, base).href);
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.id === "lesson-title");
  console.log("PASS classroom tab relationships, keyboard focus, mobile Escape, resize, and lesson history");
} finally {
  await browser.close();
}
