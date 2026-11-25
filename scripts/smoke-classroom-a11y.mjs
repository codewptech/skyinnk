// Start the fictional preview with smoke-v1.mjs --isolated-fixture --serve-fixture --http-only.
// Run this check against that local preview: node scripts/smoke-classroom-a11y.mjs http://127.0.0.1:4319
// Pass --neutral-lesson-titles to both scripts for the syllabus label checks.
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
const lesson = "/courses/fixture-course/lessons/video-test";
const next = "/courses/fixture-course/lessons/text-test";
const neutralTitles = process.argv.includes("--neutral-lesson-titles", 3);
const [videoTitle, textTitle] = neutralTitles
  ? ["Foundations", "Practice"]
  : ["Fixture video lesson", "Fixture text lesson"];
const focus = (node) => node === document.activeElement;

async function checkSyllabusLessonTypes(width) {
  const mobileLayout = width === 375;
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === base.origin
        ? route.continue()
        : route.abort(),
    );
    await page.goto(new URL(lesson, base).href);
    const dialog = page.getByRole("dialog", { name: "Course syllabus" });
    const toggle = page.getByRole("button", {
      name: mobileLayout ? "Course syllabus" : "Hide syllabus",
      exact: true,
    });
    const panel = mobileLayout
      ? dialog
      : page.getByRole("complementary", { name: "Course syllabus" });
    const syllabus = panel.getByRole("navigation", { name: "Course lessons" });
    const currentLink = syllabus.locator('[aria-current="page"]');
    const videoLink = syllabus.getByRole("link", {
      name: "Foundations, Video lesson",
      exact: true,
    });
    const textLink = syllabus.getByRole("link", {
      name: "Practice, Text lesson",
      exact: true,
    });

    async function openDrawerWithKeyboard() {
      await toggle.focus();
      await page.keyboard.press("Enter");
      await dialog.waitFor();
    }

    async function tabTo(link) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        if (await link.evaluate(focus)) return;
      }
      assert.fail(`${width}px: syllabus link was not reachable with Tab`);
    }

    async function assertCurrent(path) {
      assert.equal(await currentLink.count(), 1);
      assert.equal(await currentLink.getAttribute("href"), path);
    }

    if (mobileLayout) {
      await openDrawerWithKeyboard();
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await toggle.and(page.locator(":focus")).waitFor();
      await page.keyboard.press("Enter");
      await dialog.waitFor();
    } else {
      await toggle.focus();
    }
    await syllabus.waitFor();
    const snapshot = await syllabus.ariaSnapshot();
    assert.deepEqual(
      [await videoLink.count(), await textLink.count()],
      [1, 1],
      `${width}px: expected title and lesson type in each accessible link name\n${snapshot}`,
    );
    assert.equal(await videoLink.getAttribute("href"), lesson);
    assert.equal(await textLink.getAttribute("href"), next);
    assert.match(await videoLink.innerText(), /Foundations$/);
    assert.match(await textLink.innerText(), /Practice$/);
    await assertCurrent(lesson);
    await tabTo(videoLink);
    await tabTo(textLink);
    await page.keyboard.press("Enter");
    await page.waitForURL(new URL(next, base).href);
    if (mobileLayout) await dialog.waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "Practice", level: 1 })
      .and(page.locator(":focus")).waitFor();
    if (mobileLayout) await openDrawerWithKeyboard();
    await assertCurrent(next);
    if (mobileLayout) {
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    await page.goBack();
    await page.waitForURL(new URL(lesson, base).href);
    await page.getByRole("heading", { name: "Foundations", level: 1 }).waitFor();
    await page.goForward();
    await page.waitForURL(new URL(next, base).href);
    await page.getByRole("heading", { name: "Practice", level: 1 }).waitFor();
    console.log(`PASS neutral syllabus names, keyboard, current lesson and history at ${width}px`);
  } finally {
    await page.close();
  }
}

async function checkBlockedVideo(width) {
  const page = await browser.newPage({ viewport: { width, height: 812 } });
  try {
    const embedUrl = "https://www.youtube-nocookie.com/embed/abcdefghijk";
    const watchUrl = "https://www.youtube.com/watch?v=abcdefghijk";
    const embedRequests = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.href === embedUrl) embedRequests.push(url.href);
      return url.origin === base.origin ? route.continue() : route.abort();
    });
    await page.goto(new URL(lesson, base).href);
    const load = page.getByRole("button", { name: "Load lesson video" });
    const fallback = page.getByRole("link", {
      name: "Watch on YouTube (opens in a new tab)",
      exact: true,
    });
    const iframe = page.locator("iframe");
    await fallback.waitFor();
    assert.equal(await fallback.getAttribute("href"), watchUrl);
    assert.equal(await iframe.count(), 0);
    assert.deepEqual(embedRequests, []);
    await load.focus();
    const blocked = page.waitForEvent("requestfailed", {
      predicate: (request) => request.url() === embedUrl,
    });
    await page.keyboard.press("Enter");
    await blocked;
    assert.equal(await iframe.count(), 1);
    assert.deepEqual(embedRequests, [embedUrl]);
    assert.deepEqual(
      {
        fallbackVisible: await fallback.isVisible(),
        fallbackFocused:
          (await fallback.and(page.locator(":focus")).count()) === 1,
      },
      { fallbackVisible: true, fallbackFocused: true },
      `${width}px: the blocked embed must leave a visible, focused watch link`,
    );
    assert.equal(await fallback.getAttribute("href"), watchUrl);
    assert.equal(
      await fallback.evaluate(
        (link) =>
          link.matches(":focus-visible") &&
          getComputedStyle(link).outlineStyle !== "none",
      ),
      true,
    );
    await page.keyboard.press("Tab");
    const overview = page.getByRole("tab", { name: "Overview" });
    assert.equal(await overview.evaluate(focus), true);
    await page.keyboard.press("ArrowRight");
    await page.getByRole("tabpanel").getByText("Fixture notes marker").waitFor();
    assert.equal(await iframe.count(), 1);
    const nextLesson = page.getByRole("link", { name: /next lesson/i });
    await nextLesson.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(new URL(next, base).href);
    const textHeading = page.getByRole("heading", {
      name: textTitle,
      level: 1,
    });
    await textHeading.waitFor();
    await page.waitForFunction(
      () => document.activeElement?.id === "lesson-title",
    );
    assert.equal(await iframe.count(), 0);
    assert.equal(await fallback.count(), 0);
    assert.equal(await load.count(), 0);
    assert.deepEqual(embedRequests, [embedUrl]);
    await page.goBack();
    await page.waitForURL(new URL(lesson, base).href);
    await load.waitFor();
    await fallback.waitFor();
    assert.equal(await iframe.count(), 0);
    assert.deepEqual(embedRequests, [embedUrl]);
    console.log(
      `PASS blocked video recovery, keyboard focus and lesson navigation at ${width}px`,
    );
  } finally {
    await page.close();
  }
}

try {
  console.log(`Chromium ${browser.version()}`);
  if (neutralTitles) {
    const layouts = await Promise.allSettled([375, 1365].map(checkSyllabusLessonTypes));
    const failures = layouts.filter((result) => result.status === "rejected");
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason));
  }
  for (const width of [320, 375, 1365]) await checkBlockedVideo(width);
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === base.origin
      ? route.continue()
      : route.abort(),
  );
  await page.goto(new URL(lesson, base).href);
  await page.getByRole("heading", { name: videoTitle, level: 1 }).waitFor();
  const relationships = await page.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      return panel?.getAttribute("role") === "tabpanel" &&
        panel.getAttribute("aria-labelledby") === tab.id &&
        panel.hidden === (tab.getAttribute("aria-selected") !== "true");
    }),
  );
  assert.deepEqual(relationships, [true, true, true]);
  const overview = page.getByRole("tab", { name: "Overview" });
  const notes = page.getByRole("tab", { name: "Notes" });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await notes.evaluate(focus), true);
  await page.getByRole("tabpanel").getByText("Fixture notes marker").waitFor();

  // The real lesson renderer must preserve table semantics and expose a
  // keyboard scroll target only while a table is wider than the panel.
  const smallTable = page.getByRole("region", { name: "Lesson notes table 1", exact: true });
  const wideTable = page.getByRole("region", { name: "Lesson notes table 2", exact: true });
  await wideTable.getByRole("table").waitFor();
  assert.equal(await wideTable.getByRole("columnheader").count(), 8);
  assert.equal(await wideTable.getByRole("cell").count(), 8);
  await page.waitForFunction(() => {
    const targets = document.querySelectorAll(".notes-table-scroll");
    return targets.length === 2 && targets[0].tabIndex === -1 && targets[1].tabIndex === 0;
  });
  // Reach the scroll container through the normal tab sequence.
  await notes.focus();
  for (let i = 0; i < 6 && !(await wideTable.evaluate(focus)); i++) await page.keyboard.press("Tab");
  assert.equal(await wideTable.evaluate(focus), true, "Wide notes table must be keyboard reachable");
  assert.equal(await wideTable.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none"), true);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelectorAll(".notes-table-scroll")[1].scrollLeft > 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.waitForFunction(() => {
    const targets = document.querySelectorAll(".notes-table-scroll");
    return targets[0]?.tabIndex === -1 && targets[1]?.tabIndex === -1;
  });
  assert.equal(await smallTable.getByRole("table").count(), 1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForFunction(() => document.querySelectorAll(".notes-table-scroll")[1]?.tabIndex === 0);
  await notes.focus();
  console.log("PASS native notes tables, keyboard scrolling and resize-aware tab order");
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
  await page.getByRole("heading", { name: textTitle, level: 1 }).waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "lesson-title");
  assert.equal(await resources.count(), 0);
  assert.equal(await overview.getAttribute("aria-selected"), "true");
  await page.goBack();
  await page.waitForURL(new URL(lesson, base).href);
  await resources.waitFor();
  assert.equal(await overview.getAttribute("aria-selected"), "true");
  await page.setViewportSize({ width: 375, height: 812 });
  await mobile.click();
  await dialog.getByRole("link", { name: textTitle }).click();
  await page.waitForURL(new URL(next, base).href);
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.id === "lesson-title");
  console.log("PASS classroom tab relationships, keyboard focus, mobile Escape, resize, and lesson history");
} finally {
  await browser.close();
}
