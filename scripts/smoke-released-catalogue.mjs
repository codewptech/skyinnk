/**
 * Manifest-driven real Chromium/HTTP acceptance for the checked-in release.
 * Run only against a loopback production preview:
 * node scripts/smoke-released-catalogue.mjs http://127.0.0.1:4318 content/catalogue.json
 * A synthetic manifest may be used to exercise the nonempty path in an isolated build.
 * Never publishes, approves, or loads external media.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readReleaseExpectations } from "./released-catalogue-expectations.mjs";

const [rawBase, manifestPath, ...extra] = process.argv.slice(2);
assert.ok(
  rawBase && manifestPath && !extra.length,
  "Pass loopback preview URL and source manifest path",
);
const base = new URL(rawBase);
assert.equal(base.protocol, "http:");
assert.equal(base.hostname, "127.0.0.1");
assert.equal(base.pathname, "/");
assert.ok(!base.username && !base.password && !base.search && !base.hash);
const courses = await readReleaseExpectations(manifestPath);
const url = (path) => new URL(path, base).href;
async function request(path, status = 200) {
  const response = await fetch(url(path), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status, path);
  return response;
}
const summary = await request("/api/v1/public/courses");
assert.match(summary.headers.get("cache-control") ?? "", /\bno-store\b/);
assert.deepEqual(await summary.json(), {
  courses: courses.map((course) => course.summary),
});
const sitemap = await (await request("/sitemap.xml")).text();
for (const path of [
  "/",
  "/courses",
  "/privacy-policy",
  "/terms-of-service",
  ...courses.flatMap((course) => [
    course.path,
    ...course.lessons.map((lesson) => lesson.path),
  ]),
]) {
  assert.ok(
    sitemap.includes("<loc>https://www.skyinnk.in" + path + "</loc>"),
    "Missing sitemap route " + path,
  );
}
assert.deepEqual(await (await request("/api/v1/health")).json(), {
  status: "ok",
});
for (const path of [
  "/api/health",
  "/api/ready",
  "/api/auth/sync",
  "/api/v1/auth/sync",
  "/courses/__smoke_missing__",
  "/courses/__smoke_missing__/lessons/__smoke_missing__",
]) {
  await request(path, 404);
}
const checked = new Set();
for (const course of courses) {
  const outline = await (
    await request("/api/v1/public/courses/" + course.slug)
  ).json();
  assert.equal(outline.course.slug, course.slug);
  assert.deepEqual(
    outline.course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.slug),
    ),
    course.lessons.map((lesson) => lesson.slug),
  );
  for (const lesson of course.lessons) {
    const detail = await (
      await request(
        "/api/v1/public/courses/" + course.slug + "/lessons/" + lesson.slug,
      )
    ).json();
    assert.equal(detail.lesson.slug, lesson.slug);
    assert.equal(detail.lesson.kind, lesson.kind);
    assert.equal(!!detail.lesson.notesMarkdown, lesson.hasNotes);
    assert.deepEqual(
      detail.lesson.resources.map((resource) => resource.url),
      lesson.resources.map((resource) => resource.url),
    );
    assert.ok(
      !("publication" in detail.lesson) && !("publication" in detail.course),
    );
    for (const resource of lesson.resources) {
      if (checked.has(resource.url)) continue;
      const asset = await request(resource.url);
      assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
      const bytes = Buffer.from(await asset.arrayBuffer());
      assert.equal(bytes.length, resource.sizeBytes, resource.url);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        resource.sha256,
        resource.url,
      );
      checked.add(resource.url);
    }
  }
}
console.log(
  "PASS source-matched public API, sitemap, legacy 404s and " +
    checked.size +
    " reviewed resource byte checks",
);
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
});
async function view(page, path, heading) {
  const response = await page.goto(url(path), { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, path);
  await page
    .getByRole("heading", { level: 1, name: heading, exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    "Horizontal overflow " + path,
  );
}
async function activate(link, page, touch) {
  await link.waitFor();
  if (touch) await link.tap();
  else {
    await link.focus();
    assert.ok(
      await link.evaluate((node) => node === document.activeElement),
      "Link focus",
    );
    await page.keyboard.press("Enter");
  }
}
try {
  for (const width of [320, 375, 768, 1365]) {
    const mobile = width <= 375;
    const page = await browser.newPage({
      viewport: { width, height: mobile ? 812 : 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    const offsite = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => {
      const target = new URL(route.request().url());
      if (target.origin === base.origin) return route.continue();
      offsite.push(target.href);
      return route.abort();
    });
    try {
      await view(page, "/", "Understand more. Learn at your pace.");
      await activate(
        page.getByRole("link", { name: "Explore free lessons", exact: true }),
        page,
        mobile,
      );
      await page.waitForURL(url("/courses"));
      await page
        .getByRole("heading", { name: "Explore courses", exact: true })
        .waitFor();
      const cards = page.getByRole("main").getByRole("article");
      assert.equal(await cards.count(), courses.length);
      const empty = page.getByRole("heading", {
        name: "Lessons are being prepared",
        exact: true,
      });
      if (!courses.length) await empty.waitFor();
      else assert.equal(await empty.count(), 0);
      for (const course of courses) {
        await view(page, "/courses", "Explore courses");
        const link = page
          .getByRole("main")
          .getByRole("link", { name: course.linkName, exact: true });
        assert.equal(await link.count(), 1, course.path);
        assert.equal(await link.getAttribute("href"), course.path);
        await activate(link, page, mobile);
        await page.waitForURL(url(course.path));
        await page
          .getByRole("heading", { level: 1, name: course.title, exact: true })
          .waitFor();
        for (const lesson of course.lessons) {
          const lessonLink = page
            .getByRole("main")
            .getByRole("link", { name: lesson.linkName, exact: true });
          assert.equal(await lessonLink.count(), 1, lesson.path);
          assert.equal(await lessonLink.getAttribute("href"), lesson.path);
        }
        for (const [index, lesson] of course.lessons.entries()) {
          await view(page, lesson.path, lesson.title);
          assert.equal(
            await page.locator("iframe").count(),
            0,
            "Video preloaded on " + lesson.path,
          );
          const load = page.getByRole("button", {
            name: /load.*video|play.*video|watch.*video/i,
          });
          if (lesson.kind === "video") await load.waitFor();
          else assert.equal(await load.count(), 0);
          if (lesson.hasNotes) {
            const tab = page.getByRole("tab", { name: "Notes", exact: true });
            await tab.click();
            assert.equal(await tab.getAttribute("aria-selected"), "true");
            await page.getByRole("tabpanel").waitFor();
          }
          if (lesson.resources.length) {
            const tab = page.getByRole("tab", {
              name: "Resources",
              exact: true,
            });
            await tab.click();
            assert.equal(await tab.getAttribute("aria-selected"), "true");
            for (const resource of lesson.resources) {
              await page
                .getByRole("tabpanel")
                .locator('a[href="' + resource.url + '"]')
                .first()
                .waitFor();
            }
          }
          if (index)
            assert.equal(
              await page.locator("a.previous-lesson").getAttribute("href"),
              course.lessons[index - 1].path,
            );
          if (index + 1 < course.lessons.length)
            assert.equal(
              await page.locator("a.next-lesson").getAttribute("href"),
              course.lessons[index + 1].path,
            );
          else
            assert.equal(
              await page.locator("a.next-lesson").getAttribute("href"),
              course.path,
            );
        }
      }
      assert.deepEqual(errors, [], "Browser errors");
      assert.deepEqual(
        offsite,
        [],
        "Unexpected offsite request; no real media or tracking may preload",
      );
      console.log(
        "PASS manifest-driven guest navigation: " +
          courses.length +
          " courses at " +
          width +
          "px",
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
