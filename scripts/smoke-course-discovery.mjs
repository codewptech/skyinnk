/**
 * Opt-in Chromium acceptance for guest course discovery.
 * Empty production preview: node scripts/smoke-course-discovery.mjs http://127.0.0.1:4318
 * Fictional preview: run node scripts/smoke-v1.mjs --isolated-fixture --http-only
 * --serve-fixture --artifacts <directory>, then pass its URL and
 * <directory>/fixture-parameters.json to this script. For a disposable build
 * with multiple fictional courses, pass an array of those same parameter
 * objects, one for each course in the fixture catalogue.
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
const courses = Array.isArray(fixture) ? fixture : fixture ? [fixture] : [];
assert.ok(!fixture || courses.length, "Provide at least one fictional course");
const nameFailures = [];

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
      () =>
        expectNoHorizontalOverflow(page, "330px oversized negative control"),
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

async function checkCourseNavigation(page, course, coursePath, mobile) {
  assert.equal(
    await page.getByRole("link", { name: "All courses" }).getAttribute("href"),
    "/courses",
  );

  for (const [index, slug] of course.lessonSlugs.entries()) {
    const lesson = page.getByRole("link", {
      name: course.lessonTitles[index],
      exact: true,
    });
    assert.equal(
      await lesson.getAttribute("href"),
      `${coursePath}/lessons/${slug}`,
    );
  }
  const lessonPath = `${coursePath}/lessons/${course.lessonSlugs[0]}`;
  await activateLink(page, course.lessonTitles[0], mobile);
  await expectPage(page, lessonPath, course.lessonTitles[0]);
  await page.goBack();
  await expectPage(page, coursePath, course.courseTitle);
  await page.goBack();
  await expectPage(page, "/courses", "Explore courses");
  await page.goForward();
  await expectPage(page, coursePath, course.courseTitle);
  assert.equal((await page.goto(new URL(coursePath, base).href)).status(), 200);
  await expectPage(page, coursePath, course.courseTitle);
  assert.equal(
    (
      await page.goto(
        new URL(`${coursePath}/lessons/missing-lesson`, base).href,
      )
    ).status(),
    404,
  );
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
      if (courses.length) {
        assert.equal(await empty.count(), 0);
        const cards = catalogue.getByRole("article");
        assert.equal(await cards.count(), courses.length);
        const missingNames = [];
        for (const course of courses) {
          const heading = page.getByRole("heading", {
            level: 2,
            name: course.courseTitle,
            exact: true,
          });
          const card = cards.filter({ has: heading });
          assert.equal(await card.count(), 1);
          const link = card.getByRole("link");
          assert.equal((await link.innerText()).trim(), "View syllabus");
          assert.equal(
            await link.getAttribute("href"),
            `/courses/${course.courseSlug}`,
          );

          const name = `View syllabus: ${course.courseTitle}`;
          if (
            (await card.getByRole("link", { name, exact: true }).count()) !==
              1 ||
            (await catalogue
              .getByRole("link", { name, exact: true })
              .count()) !== 1
          ) {
            missingNames.push(name);
          }
        }
        if (missingNames.length) {
          const snapshot = await cards.all();
          const observed = await Promise.all(
            snapshot.map((card) => card.ariaSnapshot()),
          );
          nameFailures.push(`${width}px expected one link for each of ${missingNames.join(", ")}:
${observed.join("\n")}`);
          continue;
        }

        for (const course of courses) {
          const coursePath = `/courses/${course.courseSlug}`;
          await activateLink(
            page,
            `View syllabus: ${course.courseTitle}`,
            mobile,
          );
          await expectPage(page, coursePath, course.courseTitle);
          await checkCourseNavigation(page, course, coursePath, mobile);
          await page.goto(new URL("/courses", base).href);
          await expectPage(page, "/courses", "Explore courses");
        }
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
        `PASS ${courses.length ? `${courses.length}-course fictional` : "empty"} catalogue at ${width}px (${mobile ? "touch" : "keyboard"})`,
      );
    } finally {
      await page.close();
    }
  }
  assert.equal(
    nameFailures.length,
    0,
    `Course-specific accessible names failed:\n${nameFailures.join("\n")}`,
  );
} finally {
  await browser.close();
}
