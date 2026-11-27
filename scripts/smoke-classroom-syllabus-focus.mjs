// Use the standard fictional production preview; never a live site.
// node scripts/smoke-classroom-syllabus-focus.mjs http://127.0.0.1:4319
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
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const desktop = page.locator(".desktop-toggle");
const mobile = page.locator(".mobile-toggle");
const drawer = page.locator("#mobile-syllabus");
const outside = page.getByRole("tab", { name: "Overview" });
const resize = (width) => page.setViewportSize({ width, height: 900 });
async function focused(locator) {
  await locator.and(page.locator(":focus")).waitFor({ timeout: 5000 });
}
try {
  await page.route("**/*", route =>
    new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort(),
  );
  await page.goto(new URL("/courses/fixture-course/lessons/video-test", base).href);
  // Confirm hydration by exercising the actual sidebar state.
  await desktop.click();
  await page.locator("#desktop-syllabus").waitFor({ state: "hidden" });
  await desktop.click();
  await page.locator("#desktop-syllabus").waitFor({ state: "visible" });
  await desktop.focus();
  await resize(375);
  await focused(mobile);
  await resize(1365);
  await focused(desktop);
  const link = page.locator("#desktop-syllabus a").first();
  await link.focus();
  await resize(375);
  await focused(mobile);
  await mobile.click();
  await drawer.waitFor({ state: "visible" });
  await resize(1365);
  await drawer.waitFor({ state: "hidden" });
  await focused(desktop);
  await outside.focus();
  await resize(375);
  await focused(outside);
  await resize(1365);
  await focused(outside);
  await desktop.focus();
  await desktop.evaluate(node => node.blur());
  await resize(375);
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), "BODY");
  console.log("PASS syllabus breakpoint focus, drawer close, outside focus and deliberate blur");
} finally {
  await browser.close();
}
