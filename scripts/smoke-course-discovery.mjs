/**
 * Opt-in Chromium acceptance for guest course discovery.
 * Empty production preview: node scripts/smoke-course-discovery.mjs http://127.0.0.1:4318
 * Fictional preview: run node scripts/smoke-v1.mjs --isolated-fixture --http-only
 * --serve-fixture --artifacts <directory>, then pass its URL and
 * <directory>/fixture-parameters.json to this script.
 *
 * Requires Playwright and its Chromium browser, or CHROMIUM_PATH.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const [previewUrl, fixturePath] = process.argv.slice(2);
assert.ok(previewUrl, "Pass the URL of a local Skyinnk production preview");
const base = new URL(previewUrl);
assert.ok(
  base.protocol === "http:" && base.hostname === "127.0.0.1",
  "Use a loopback HTTP preview, such as http://127.0.0.1:4318",
);
const fixture = fixturePath
  ? JSON.parse(await readFile(fixturePath, "utf8"))
  : null;
const coursePath = fixture ? `/courses/${fixture.courseSlug}` : null;

const require = createRequire(import.meta.url);
const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const { chromium } = require(
  require.resolve("playwright", {
    paths: [import.meta.dirname, ...(runtime ? [runtime] : [])],
  }),
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});

async function activateLink(page, name, touch) {
  const link = page.getByRole("link", { name, exact: true });
  if (touch) return link.tap();

  await link.waitFor();
  for (let step = 0; step < 20; step++) {
    if (await link.evaluate((element) => element === document.activeElement)) {
      assert.ok(
        await link.evaluate((element) => {
          const style = getComputedStyle(element);
          return (
            element.matches(":focus-visible") &&
            style.outlineStyle !== "none" &&
            Number.parseFloat(style.outlineWidth) > 0
          );
        }),
        `No visible keyboard focus outline on "${name}"`,
      );
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  assert.fail(`Link "${name}" was not reachable using Tab`);
}

async function expectNoHorizontalOverflow(page, label) {
  // Mobile Chromium may expand innerWidth when a document overflows, so it
  // cannot serve as the viewport boundary. clientWidth stays at 320px.
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    scrollWidth <= clientWidth,
    `Horizontal overflow on ${label}: document ${scrollWidth}px > viewport ${clientWidth}px`,
  );
}

async function exerciseOverflowControls(page) {
  // A positive and negative control prove that this very assertion detects
  // 330px-wide content even when mobile innerWidth expands to 330px.
  const marker = "skyinnk-overflow-negative-control";
  await page.evaluate((id) => {
    const probe = document.createElement("div");
    probe.id = id;
    probe.style.cssText =
      "position:absolute;left:0;top:0;width:320px;height:1px;pointer-events:none";
    document.body.appendChild(probe);
  }, marker);
  try {
    await expectNoHorizontalOverflow(page, "320px in-viewport control");
    await page.evaluate(
      (id) => (document.getElementById(id).style.width = "330px"),
      marker,
    );
    await assert.rejects(
      () => expectNoHorizontalOverflow(page, "330px oversized negative control"),
      /Horizontal overflow/,
    );
  } finally {
    await page.evaluate((id) => document.getElementById(id)?.remove(), marker);
  }
  await expectNoHorizontalOverflow(page, "after negative-control cleanup");
}

async function expectPage(page, path, name) {
  await page.waitForURL(new URL(path, base).href);
  await page.getByRole("heading", { level: 1, name, exact: true }).waitFor();
  await expectNoHorizontalOverflow(page, path);
}

try {
  console.log(`Chromium ${browser.version()}`);
  for (const width of [320, 375, 768, 1365]) {
    const mobile = width <= 375;
    const page = await browser.newPage({
      viewport: { width, height: mobile ? 812 : 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      assert.equal((await page.goto(base.href)).status(), 200);
      await expectPage(page, "/", "Free lessons for curious school learners.");
      await activateLink(page, "Explore free lessons", mobile);
      await expectPage(page, "/courses", "Explore courses");
      if (width === 320) await exerciseOverflowControls(page);

      const catalogue = page.getByRole("main");
      const empty = catalogue.getByRole("heading", {
        name: "Lessons are being prepared",
      });
      if (fixture) {
        assert.equal(await empty.count(), 0);
        const card = catalogue
          .getByRole("article")
          .filter({ hasText: fixture.courseTitle });
        const syllabus = card.getByRole("link", {
          name: "View syllabus",
          exact: true,
        });
        assert.equal(await syllabus.getAttribute("href"), coursePath);
        await activateLink(page, "View syllabus", mobile);
        await expectPage(page, coursePath, fixture.courseTitle);
        assert.equal(
          await page
            .getByRole("link", { name: "All courses" })
            .getAttribute("href"),
          "/courses",
        );

        for (const [index, slug] of fixture.lessonSlugs.entries()) {
          const lesson = page.getByRole("link", {
            name: fixture.lessonTitles[index],
            exact: true,
          });
          assert.equal(
            await lesson.getAttribute("href"),
            `${coursePath}/lessons/${slug}`,
          );
        }
        const lessonPath = `${coursePath}/lessons/${fixture.lessonSlugs[0]}`;
        await activateLink(page, fixture.lessonTitles[0], mobile);
        await expectPage(page, lessonPath, fixture.lessonTitles[0]);
        await page.goBack();
        await expectPage(page, coursePath, fixture.courseTitle);
        await page.goBack();
        await expectPage(page, "/courses", "Explore courses");
        await page.goForward();
        await expectPage(page, coursePath, fixture.courseTitle);
        assert.equal(
          (await page.goto(new URL(coursePath, base).href)).status(),
          200,
        );
        await expectPage(page, coursePath, fixture.courseTitle);
        assert.equal(
          (
            await page.goto(
              new URL(`${coursePath}/lessons/missing-lesson`, base).href,
            )
          ).status(),
          404,
        );
      } else {
        await empty.waitFor();
        assert.equal(await catalogue.getByRole("article").count(), 0);
        await activateLink(page, "Skyinnk / Home", mobile);
        await expectPage(
          page,
          "/",
          "Free lessons for curious school learners.",
        );
        await page.goBack();
        await expectPage(page, "/courses", "Explore courses");
        await empty.waitFor();
      }
      assert.equal(
        (
          await page.goto(new URL("/courses/missing-course", base).href)
        ).status(),
        404,
      );
      assert.deepEqual(pageErrors, []);
      console.log(
        `PASS ${fixture ? "fictional" : "empty"} catalogue at ${width}px (${mobile ? "touch" : "keyboard"})`,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
