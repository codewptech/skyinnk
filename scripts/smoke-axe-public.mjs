/**
 * Real opt-in axe-core WCAG browser audit of the empty or fictional-published
 * Skyinnk V1 public experience. Not human assistive-technology certification.
 * Run: node scripts/smoke-axe-public.mjs http://127.0.0.1:4318 empty
 * Run: node scripts/smoke-axe-public.mjs http://127.0.0.1:4319 published
 * Playwright and axe-core are temporary CI-only dependencies, not lockfile edits.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeJavaScript = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [rawBase, mode] = process.argv.slice(2);
assert.ok(rawBase && ["empty", "published"].includes(mode), "Usage: smoke-axe-public.mjs http://127.0.0.1:PORT empty|published");
const base = new URL(rawBase);
assert.equal(base.protocol, "http:");
assert.equal(base.hostname, "127.0.0.1", "Never scan a remote site or real account");
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const routes = [
  ["/", "Home"],
  ["/courses", "Catalogue"],
  ["/privacy-policy", "Privacy policy"],
  ["/terms-of-service", "Terms of service"],
];
if (mode === "published") {
  routes.push(
    ["/courses/fixture-course", "Fictional course detail"],
    ["/courses/fixture-course/lessons/video-test", "Fictional video lesson"],
    ["/courses/fixture-course/lessons/text-test", "Fictional text lesson"],
  );
}
let scans = 0;
let violations = 0;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  args: ["--no-sandbox"],
});
try {
  console.log("Real Chromium:", browser.version(), "mode:", mode);
  for (const width of [375, 1365]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 375 ? 812 : 900 },
      isMobile: width === 375,
      hasTouch: width === 375,
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", request => {
      const url = new URL(request.request().url());
      return url.origin === base.origin ? request.continue() : request.abort();
    });
    try {
      async function scan(label) {
        await page.addScriptTag({ content: axeJavaScript });
        const result = await page.evaluate(async (runTags) => {
          return await window.axe.run(document, {
            runOnly: { type: "tag", values: runTags },
            resultTypes: ["violations", "passes", "incomplete"],
          });
        }, tags);
        scans++;
        console.log(`AXE ${width}px ${label}: ${result.passes.length} rules passed, ${result.violations.length} violations, ${result.incomplete.length} needs manual review`);
        for (const violation of result.violations) {
          violations++;
          console.error(JSON.stringify({
            viewport: width,
            page: label,
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            helpUrl: violation.helpUrl,
            affected: violation.nodes.slice(0, 6).map(node => ({
              target: node.target,
              html: node.html?.slice(0, 200),
              failureSummary: node.failureSummary?.slice(0, 300),
            })),
          }));
        }
      }
      for (const [route, label] of routes) {
        const response = await page.goto(new URL(route, base), { waitUntil: "networkidle" });
        assert.equal(response?.status(), 200, `${label} must be publicly available`);
        await page.getByRole("main").first().waitFor();
        await scan(label);
        if (mode === "published" && route.endsWith("/video-test")) {
          await page.getByRole("tab", { name: "Notes" }).click();
          await scan("Fictional lesson Notes panel");
          await page.getByRole("tab", { name: "Resources" }).click();
          await scan("Fictional lesson Resources panel");
          if (width === 375) {
            await page.getByRole("button", { name: "Course syllabus", exact: true }).click();
            await page.locator("dialog[open]").waitFor();
            await scan("Open mobile syllabus dialog");
          }
        }
      }
      assert.deepEqual(errors, [], `${width}px browser runtime errors`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`Completed ${scans} actual axe-core WCAG 2/2.1 A/AA scans; total violations ${violations}`);
if (!scans || violations) process.exitCode = 1;
