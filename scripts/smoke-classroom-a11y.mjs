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

// axe cannot decide contrast for non-text characters or the closed native
// dialog's IDREF. Check actual browser relationships and computed solid colors
// separately; this is not human screen-reader or physical-device certification.
async function assertDrawerState(page, expectedOpen) {
  await page.waitForFunction(expected => {
    const toggle = document.querySelector(".mobile-toggle");
    const id = toggle?.getAttribute("aria-controls");
    const target = id && document.getElementById(id);
    const titleId = target?.getAttribute("aria-labelledby");
    return !!id && document.querySelectorAll("[id]").length > 0 &&
      [...document.querySelectorAll("[id]")].filter(node => node.id === id).length === 1 &&
      toggle.getAttribute("aria-haspopup") === "dialog" &&
      toggle.getAttribute("aria-expanded") === String(expected) &&
      target instanceof HTMLDialogElement && target.open === expected &&
      target.matches(":modal") === expected &&
      !!titleId && [...document.querySelectorAll("[id]")].filter(node => node.id === titleId).length === 1 &&
      target.contains(document.getElementById(titleId)) &&
      document.getElementById(titleId)?.textContent.trim() === "Course syllabus";
  }, expectedOpen);
}

async function assertSymbolContrast(symbol, label) {
  await symbol.waitFor();
  const ratio = await symbol.evaluate(node => {
    function rgb(value) {
      const parts = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(value);
      if (!parts) throw Error("Expected computed RGB color: " + value);
      return { channels: parts.slice(1, 4).map(Number), alpha: parts[4] === undefined ? 1 : Number(parts[4]) };
    }
    function luminance(color) {
      const [r, g, b] = color.channels.map(channel => {
        const v = channel / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const foreground = rgb(getComputedStyle(node).color);
    if (foreground.alpha !== 1) throw Error("Non-opaque symbol needs review");
    let background;
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== "1" || style.backgroundImage !== "none")
        throw Error("Non-solid symbol background needs review");
      const color = rgb(style.backgroundColor);
      if (color.alpha === 1) { background = color; break; }
      if (color.alpha !== 0) throw Error("Translucent symbol background needs review");
    }
    if (!background) throw Error("No explicit opaque background for symbol");
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  });
  assert.ok(ratio >= 3, label + ": computed contrast " + ratio.toFixed(2) + ":1");
  console.log("PASS computed symbol contrast " + label + ": " + ratio.toFixed(2) + ":1");
}

async function checkDialogAndSymbolEvidence(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const mobile = width < 701;
  try {
    await page.route("**/*", route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    await page.goto(new URL(lesson, base).href);
    await page.getByRole("heading", { name: videoTitle, level: 1 }).waitFor();
    const toggle = page.locator(mobile ? ".mobile-toggle" : ".desktop-toggle");
    await assertSymbolContrast(toggle.locator("span[aria-hidden=true]"), width + "px syllabus toggle");
    await assertSymbolContrast(page.locator(".play-symbol"), width + "px play symbol");
    if (mobile) {
      await assertDrawerState(page, false);
      await toggle.click();
      await assertDrawerState(page, true);
    }
    const panel = page.locator(mobile ? "#mobile-syllabus" : "#desktop-syllabus");
    const current = panel.locator('a[aria-current="page"]');
    const other = panel.locator('a:not([aria-current="page"])');
    assert.equal(await current.count(), 1);
    assert.equal(await other.count(), 1);
    await assertSymbolContrast(current.locator(".lesson-kind"), width + "px current lesson symbol");
    await assertSymbolContrast(other.locator(".lesson-kind"), width + "px other lesson symbol");
    await other.hover();
    await assertSymbolContrast(other.locator(".lesson-kind"), width + "px hovered lesson symbol");
    if (mobile) {
      await page.keyboard.press("Escape");
      await assertDrawerState(page, false);
      await toggle.and(page.locator(":focus")).waitFor();
    }
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

async function checkResourceTouchTargets(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width <= 375 });
  try {
    await page.route("**/*", route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    await page.goto(new URL(lesson, base).href);
    const resources = page.getByRole("tab", { name: "Resources" });
    await resources.click();
    const panel = page.getByRole("tabpanel");
    const preview = panel.getByRole("link", { name: /^Preview.*Fixture text resource.*opens in a new tab/i });
    const download = panel.getByRole("link", { name: /^Download.*Fixture text resource/i });
    for (const [label, link] of [["Preview", preview], ["Download", download]]) {
      await link.waitFor();
      const bounds = await link.boundingBox();
      assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44,
        `${width}px: ${label} target must be at least 44x44 CSS px; observed ${JSON.stringify(bounds)}`);
      assert.equal(await link.getAttribute("href"), "/resources/public/fixture.txt");
    }
    assert.equal(await preview.getAttribute("target"), "_blank");
    assert.equal(await download.getAttribute("download"), "");
    await resources.focus();
    for (const link of [preview, download]) {
      for (let step = 0; step < 5 && !(await link.evaluate(focus)); step++) await page.keyboard.press("Tab");
      assert.equal(await link.evaluate(focus), true);
      assert.equal(await link.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none"), true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    console.log(`PASS resource touch targets, destinations, keyboard focus and reflow at ${width}px`);
  } finally {
    await page.close();
  }
}

try {
  console.log(`Chromium ${browser.version()}`);
  for (const width of [320, 375, 1365]) await checkResourceTouchTargets(width);
  if (neutralTitles) {
    const layouts = await Promise.allSettled([375, 1365].map(checkSyllabusLessonTypes));
    const failures = layouts.filter((result) => result.status === "rejected");
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason));
  }
  for (const width of [320, 375, 1365]) await checkBlockedVideo(width);
  for (const width of [375, 1365]) await checkDialogAndSymbolEvidence(width);
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
  const tableSnapshot = await wideTable.ariaSnapshot();
  assert.equal(await wideTable.getByRole("columnheader").count(), 8, tableSnapshot);
  assert.equal(await wideTable.getByRole("cell").count(), 8, tableSnapshot);
  assert.equal(await wideTable.locator("thead th[scope=col]").count(), 8);
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
  for (const [selector, label] of [[".katex-display", "Lesson notes equation"], ["pre", "Lesson notes code block"]]) {
    const targets = page.locator(".markdown-notes " + selector);
    assert.equal(await targets.count(), 2);
    const small = targets.nth(0), wide = targets.nth(1);
    assert.equal(await small.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.equal(await wide.evaluate(node => node.scrollWidth > node.clientWidth + 1), true);
    assert.equal(await small.getAttribute("tabindex"), "-1");
    assert.equal(await wide.getAttribute("tabindex"), "0");
    assert.equal(await wide.getAttribute("aria-label"), label + " 2");
    await notes.focus();
    for (let i = 0; i < 12 && !(await wide.evaluate(focus)); i++) await page.keyboard.press("Tab");
    assert.equal(await wide.evaluate(focus), true);
    assert.equal(await wide.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none"), true);
    await wide.evaluate(node => { node.scrollLeft = 0; });
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(selector => document.querySelectorAll(".markdown-notes " + selector)[1].scrollLeft > 0, selector);
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.waitForFunction(selector => document.querySelectorAll(".markdown-notes " + selector)[1].tabIndex === -1, selector);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForFunction(selector => document.querySelectorAll(".markdown-notes " + selector)[1].tabIndex === 0, selector);
  }
  await notes.focus();
  console.log("PASS native notes tables, math and code keyboard scrolling and resize-aware tab order");
  await page.keyboard.press("End");
  const resources = page.getByRole("tab", { name: "Resources" });
  assert.equal(await resources.evaluate(focus), true);
  await page.getByRole("tabpanel").getByRole("link", { name: /download fixture text resource/i }).waitFor();
  await page.keyboard.press("Home");
  assert.equal(await overview.evaluate(focus), true);

  const mobile = page.getByRole("button", { name: "Course syllabus", exact: true });
  const dialog = page.getByRole("dialog");
  await assertDrawerState(page, false);
  await mobile.click();
  await dialog.waitFor();
  await assertDrawerState(page, true);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await assertDrawerState(page, false);
  await page.waitForFunction(() => document.activeElement?.classList.contains("mobile-toggle"));
  await mobile.click();
  await dialog.waitFor();
  await page.setViewportSize({ width: 1365, height: 900 });
  await dialog.waitFor({ state: "hidden", timeout: 3000 });
  await assertDrawerState(page, false);
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
  await assertDrawerState(page, true);
  await dialog.getByRole("link", { name: textTitle }).click();
  await page.waitForURL(new URL(next, base).href);
  await dialog.waitFor({ state: "hidden" });
  await assertDrawerState(page, false);
  await page.waitForFunction(() => document.activeElement?.id === "lesson-title");
  console.log("PASS classroom tab relationships, keyboard focus, mobile Escape, resize, and lesson history");
} finally {
  await browser.close();
}
