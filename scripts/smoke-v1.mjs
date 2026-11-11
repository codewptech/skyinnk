/**
 * Opt-in HTTP + real Chromium smoke. Not part of routine lightweight CI.
 * Usage: node scripts/smoke-v1.mjs --base-url http://127.0.0.1:3000
 * Add --fixture /absolute/fixture.json for an isolated, test-only catalogue build.
 * Fixture: { courseSlug, courseTitle, lessonSlugs: [videoSlug, textSlug], lessonTitles, notesMarker, resourcePath }
 * This script never changes source/content, deploys, or connects to a database.
 */
import assert from "node:assert/strict";
import {
  readFile,
  mkdir,
  writeFile,
  mkdtemp,
  cp,
  symlink,
  rm,
  readdir,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { setTimeout as pause } from "node:timers/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const httpOnly = args.includes("--http-only");
if (args.includes("--isolated-fixture")) {
  await runIsolatedFixture();
  process.exit(0);
}
const base = new URL(
  option("--base-url") || process.env.BASE_URL || "http://127.0.0.1:3000",
);
assert.ok(
  ["http:", "https:"].includes(base.protocol),
  "Use an HTTP(S) preview URL",
);
const fixture = option("--fixture")
  ? JSON.parse(await readFile(option("--fixture"), "utf8"))
  : null;
const outputDirectory = option("--artifacts");
const evidence = {
  checkedAt: new Date().toISOString(),
  baseUrl: base.origin,
  fixture: !!fixture,
  checks: [],
  browserErrors: [],
};
function passed(name) {
  evidence.checks.push(name);
  console.log(`PASS ${name}`);
}
async function response(path, expected = 200) {
  const result = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(
    result.status,
    expected,
    `${path}: expected ${expected}, got ${result.status}`,
  );
  return { response: result, html: await result.text() };
}
function noTrackingRequests(requests) {
  return requests.filter((url) =>
    /googletagmanager\.com|google-analytics\.com|youtube(?:-nocookie)?\.com|ytimg\.com/.test(
      url,
    ),
  );
}

let browser;
try {
  for (const path of ["/", "/courses"]) {
    const { html, response: result } = await response(path);
    assert.match(html, /<h1\b/);
    assert.match(html, /<title>/);
    assert.match(result.headers.get("cache-control") || "", /no-store/);
    passed(`production SSR + private cache headers ${path}`);
  }
  const health = await response("/api/v1/health");
  assert.deepEqual(JSON.parse(health.html), { status: "ok" });
  passed("versioned health independent of database");
  for (const path of [
    "/api/health",
    "/api/ready",
    "/api/auth/sync",
    "/courses/not-a-published-course",
    "/courses/not-a-published-course/lessons/not-published",
  ]) {
    await response(path, 404);
  }
  passed("legacy APIs and unpublished content routes return 404");
  await response("/api/v1/auth/sync", 404); // GET cannot invoke POST-only sync.
  passed("sync remains POST-only");

  if (fixture) {
    const coursePath = `/courses/${fixture.courseSlug}`;
    const paths = [
      coursePath,
      ...fixture.lessonSlugs.map((slug) => `${coursePath}/lessons/${slug}`),
    ];
    const titles = [fixture.courseTitle, ...fixture.lessonTitles];
    assert.equal(
      paths.length,
      titles.length,
      "Fixture titles must match all expected routes",
    );
    for (const [index, path] of paths.entries()) {
      const { html } = await response(path);
      const heading = html
        .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
        ?.replace(/<[^>]*>/g, "")
        .trim();
      const escapedTitle = String(titles[index])
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      assert.equal(
        heading,
        escapedTitle,
        `${path} must render its own expected heading`,
      );
      assert.ok(
        !html.includes("<script>window.fixtureXss"),
        "Raw content script executed in SSR",
      );
    }
    if (fixture.resourcePath) await response(fixture.resourcePath);
    passed(
      "isolated fixture course, video/text lesson SSR and public resource served",
    );
    const sitemap = await response("/sitemap.xml");
    for (const slug of fixture.lessonSlugs)
      assert.ok(sitemap.html.includes(`${coursePath}/lessons/${slug}`));
    passed("fixture public lesson URLs included in sitemap");
  }
  if (httpOnly) {
    evidence.browserStatus = "not-run: --http-only selected";
    passed("HTTP-only mode completed; browser checks explicitly not run");
  } else {
    const require = createRequire(import.meta.url);
    let playwright;
    try {
      playwright = require("playwright");
    } catch {
      const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
      assert.ok(
        runtime,
        "Install Playwright for opt-in smoke, or set CODEX_PRIMARY_RUNTIME_NODE_MODULES",
      );
      playwright = require(join(runtime, "playwright"));
    }
    browser = await playwright.chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1365, height: 900 },
    });
    page.on("pageerror", (error) => evidence.browserErrors.push(error.message));
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(new URL("/", base).href, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByRole("link", { name: /explore free lessons/i }).click();
    await page.waitForURL("**/courses");
    await page.getByRole("heading", { name: /explore courses/i }).waitFor();
    assert.equal(
      noTrackingRequests(requests).length,
      0,
      `Unexpected tracking/media requests: ${noTrackingRequests(requests)}`,
    );
    passed(
      "guest client navigation home → catalogue; no tracking or media preload",
    );
    if (!fixture) {
      await page
        .getByRole("heading", { name: /lessons are being prepared/i })
        .waitFor();
      passed("honest empty production catalogue");
    } else {
      assert.equal(
        fixture.lessonSlugs.length,
        2,
        "Use a two-lesson fixture (video then text)",
      );
      const coursePath = `/courses/${fixture.courseSlug}`;
      const lessonPaths = fixture.lessonSlugs.map(
        (slug) => `${coursePath}/lessons/${slug}`,
      );
      for (const path of [coursePath, ...lessonPaths]) {
        const { html } = await response(path);
        assert.match(html, /<h1\b/);
        assert.ok(
          !html.includes("javascript:alert("),
          "Unsafe script href in SSR",
        );
      }
      passed("course and both fixture lesson routes render in production SSR");
      await page.goto(new URL(lessonPaths[0], base).href, {
        waitUntil: "networkidle",
      });
      assert.equal(
        await page.locator("iframe").count(),
        0,
        "Video must load only on student action",
      );
      assert.equal(noTrackingRequests(requests).length, 0);
      const play = page.getByRole("button", {
        name: /load.*video|play.*video|watch.*video/i,
      });
      await play.click();
      await page.locator("iframe").waitFor();
      const frame = await page.locator("iframe").elementHandle();
      assert.ok(frame);
      await page.getByRole("tab", { name: "Notes", exact: true }).click();
      await page
        .getByRole("tabpanel")
        .getByText(fixture.notesMarker, { exact: false })
        .waitFor();
      assert.equal(
        await page
          .locator("iframe")
          .evaluate((node, previous) => node === previous, frame),
        true,
      );
      await page.getByRole("tab", { name: "Overview", exact: true }).click();
      assert.equal(
        await page
          .locator("iframe")
          .evaluate((node, previous) => node === previous, frame),
        true,
      );
      passed("safe Notes render; video iframe survives tab changes");
      if (fixture.resourcePath) {
        await page.getByRole("tab", { name: "Resources", exact: true }).click();
        await page
          .locator(`a[href="${fixture.resourcePath}"]`)
          .first()
          .waitFor();
        await response(fixture.resourcePath);
        passed("public resource listed and physically served");
      }
      await page.getByRole("link", { name: /next lesson/i }).click();
      await page.waitForURL(`**${lessonPaths[1]}`);
      await page
        .getByRole("heading", {
          level: 1,
          name: fixture.lessonTitles[1],
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page.locator("iframe").count(),
        0,
        "Text-only lesson must not retain previous video",
      );
      await page.getByRole("link", { name: /previous lesson/i }).waitFor();
      await page.goBack();
      await page.waitForURL(`**${lessonPaths[0]}`);
      await page
        .getByRole("button", { name: /load.*video|play.*video|watch.*video/i })
        .waitFor();
      await page.goForward();
      await page.waitForURL(`**${lessonPaths[1]}`);
      await page
        .getByRole("heading", {
          level: 1,
          name: fixture.lessonTitles[1],
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator("iframe").count(), 0);
      passed(
        "lesson navigation updates content; browser back/forward; text-only mode",
      );
      for (const viewport of [
        { width: 375, height: 812 },
        { width: 768, height: 1024 },
        { width: 1365, height: 900 },
      ]) {
        await page.setViewportSize(viewport);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
          `Horizontal overflow at ${viewport.width}`,
        );
      }
      passed("375px, 768px and desktop widths do not overflow");
      await page.setViewportSize({ width: 375, height: 812 });
      const openSyllabus = page
        .getByRole("button", {
          name: /open syllabus|show syllabus|course syllabus/i,
        })
        .first();
      await openSyllabus.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await openSyllabus.evaluate((node) => document.activeElement === node),
        true,
      );
      passed("mobile syllabus opens, Escape closes and focus returns");
    }
    assert.deepEqual(evidence.browserErrors, [], "Browser runtime errors");
    passed("no browser runtime errors");
    evidence.browserStatus = "passed";
  }
} finally {
  if (browser) await browser.close();
  if (outputDirectory) {
    await mkdir(resolve(outputDirectory), { recursive: true });
    await writeFile(
      join(resolve(outputDirectory), "smoke-results.json"),
      JSON.stringify(evidence, null, 2) + "\n",
    );
  }
}
console.log(`${evidence.checks.length} opt-in smoke checks passed`);

async function runIsolatedFixture() {
  const project = resolve(new URL("..", import.meta.url).pathname);
  const directory = await mkdtemp(join(tmpdir(), "skyinnk-v1-fixture-"));
  const previewPort = option("--port") || "4319";
  const artifacts = resolve(
    option("--artifacts") || join(directory, "evidence"),
  );
  await mkdir(artifacts, { recursive: true });
  const testReview = {
    status: "published",
    visibility: "public",
    reviewedBy: "AUTOMATED TEST FIXTURE ONLY",
    reviewedAt: "2026-11-11T00:00:00.000Z",
  };
  const resourceBytes = "AUTOMATED TEST FIXTURE. Not educational content.\n";
  const notes =
    "# Fixture notes\n\nFixture notes marker\n\n| Item | Value |\n| --- | --- |\n| Test | 2 |\n\n$x^2$\n\n<script>window.fixtureXss=true</script>\n\n[unsafe](javascript:alert(1))\n";
  const lesson = (key, slug, title, kind, position) => ({
    key,
    slug,
    title,
    kind,
    position,
    overview:
      "Automated interface test fixture, never a reviewed educational lesson.",
    notesMarkdown: notes,
    publication: testReview,
  });
  const video = {
    ...lesson(
      "fixture-video",
      "video-test",
      "Fixture video lesson",
      "video",
      0,
    ),
    video: { provider: "youtube", publicId: "abcdefghijk" },
    resources: [
      {
        key: "fixture-resource",
        title: "Fixture text resource",
        url: "/resources/public/fixture.txt",
        type: "TXT",
        sizeBytes: Buffer.byteLength(resourceBytes),
        publication: testReview,
      },
    ],
  };
  const text = lesson(
    "fixture-text",
    "text-test",
    "Fixture text lesson",
    "text",
    0,
  );
  const catalogue = {
    schemaVersion: 1,
    courses: [
      {
        key: "fixture-course",
        slug: "fixture-course",
        title: "Automated fixture course",
        summary: "Test fixture only. Not approved educational content.",
        audience: "Test automation",
        subject: "Testing",
        publication: testReview,
        modules: [
          {
            key: "fixture-module-one",
            title: "Fixture module one",
            position: 0,
            lessons: [video],
          },
          {
            key: "fixture-module-two",
            title: "Fixture module two",
            position: 1,
            lessons: [text],
          },
        ],
      },
    ],
  };
  let server;
  const env = {
    ...process.env,
    DATABASE_URL: "postgresql://fixture@127.0.0.1:1/fixture",
    DIRECT_URL: "postgresql://fixture@127.0.0.1:1/fixture",
    NUXT_AUTH0_DOMAIN: "validation.example.invalid",
    NUXT_AUTH0_CLIENT_ID: "validation",
    NUXT_AUTH0_CLIENT_SECRET: "fixture-client-secret-unusable",
    NUXT_AUTH0_SESSION_SECRET: "fixture-session-secret-32bytes-only",
    NUXT_AUTH0_APP_BASE_URL: `http://127.0.0.1:${previewPort}`,
    NUXT_PUBLIC_ANALYTICS_ENABLED: "false",
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: previewPort,
  };
  const run = async (command, argv, logName) => {
    const child = spawn(command, argv, {
      cwd: directory,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    child.stdout.on("data", (chunk) => {
      log += chunk;
    });
    child.stderr.on("data", (chunk) => {
      log += chunk;
    });
    const code = await new Promise((done, fail) => {
      child.on("error", fail);
      child.on("exit", done);
    });
    await writeFile(join(artifacts, logName), log);
    assert.equal(code, 0, `${command} failed; see ${join(artifacts, logName)}`);
  };
  try {
    await cp(project, directory, {
      recursive: true,
      filter: (source) =>
        !/\/(?:node_modules|\.git|\.nuxt|\.output)(?:\/|$)/.test(source) &&
        !/(?:^|\/)\.env(?:\.|$)/.test(source),
    });
    // Dependency bytes may be shared, but generated caches must stay in this copy.
    await mkdir(join(directory, "node_modules"));
    for (const dependency of await readdir(join(project, "node_modules"))) {
      if (dependency === ".cache") continue;
      await symlink(
        join(project, "node_modules", dependency),
        join(directory, "node_modules", dependency),
      );
    }
    const configPath = join(directory, "nuxt.config.ts");
    const config = await readFile(configPath, "utf8");
    const declaration = "defineNuxtConfig({";
    assert.equal(
      config.split(declaration).length,
      2,
      "Expected one Nuxt config declaration for isolated buildDir",
    );
    await writeFile(
      configPath,
      config.replace(
        declaration,
        `${declaration}\n  buildDir: ${JSON.stringify(join(directory, ".nuxt"))},`,
      ),
    );
    await mkdir(join(directory, "public/resources/public"), {
      recursive: true,
    });
    await writeFile(
      join(directory, "public/resources/public/fixture.txt"),
      resourceBytes,
    );
    await writeFile(
      join(directory, "content/catalogue.json"),
      JSON.stringify(catalogue, null, 2) + "\n",
    );
    const fixturePath = join(artifacts, "fixture-parameters.json");
    await writeFile(
      fixturePath,
      JSON.stringify({
        courseSlug: "fixture-course",
        courseTitle: "Automated fixture course",
        lessonSlugs: ["video-test", "text-test"],
        lessonTitles: ["Fixture video lesson", "Fixture text lesson"],
        notesMarker: "Fixture notes marker",
        resourcePath: "/resources/public/fixture.txt",
      }),
    );
    await run("npm", ["run", "build"], "fixture-build.log");
    server = spawn(process.execPath, [".output/server/index.mjs"], {
      cwd: directory,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let serverLog = "";
    server.stdout.on("data", (chunk) => {
      serverLog += chunk;
    });
    server.stderr.on("data", (chunk) => {
      serverLog += chunk;
    });
    let available = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        available =
          (await fetch(`http://127.0.0.1:${previewPort}/api/v1/health`))
            .status === 200;
      } catch {}
      if (available || server.exitCode !== null) break;
      await pause(250);
    }
    assert.ok(available, `Isolated production preview failed: ${serverLog}`);
    await run(
      process.execPath,
      [
        "scripts/smoke-v1.mjs",
        "--base-url",
        `http://127.0.0.1:${previewPort}`,
        "--fixture",
        fixturePath,
        "--artifacts",
        artifacts,
        ...(httpOnly ? ["--http-only"] : []),
      ],
      "fixture-smoke.log",
    );
    await writeFile(join(artifacts, "fixture-preview.log"), serverLog);
    console.log(
      `PASS isolated fixture production build + smoke; evidence ${artifacts}`,
    );
    if (args.includes("--serve-fixture")) {
      console.log(
        `FIXTURE_READY http://127.0.0.1:${previewPort}/courses/fixture-course/lessons/video-test`,
      );
      console.log(`FIXTURE_TEMP ${directory}`);
      console.log(`FIXTURE_RUNNER_PID ${process.pid}`);
      console.log(
        "Send stop on stdin, SIGINT or SIGTERM for graceful cleanup.",
      );
      await new Promise((done) => {
        const stop = () => {
          process.off("SIGINT", stop);
          process.off("SIGTERM", stop);
          process.stdin.off("data", onInput);
          process.stdin.pause();
          done();
        };
        const onInput = (chunk) => {
          if (String(chunk).trim() === "stop") stop();
        };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", onInput);
      });
    }
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const stopped = new Promise((done) => server.once("exit", done));
      server.kill("SIGTERM");
      await stopped;
    }
    // Retain evidence; remove generated test source/build only when artifacts live elsewhere.
    if (!artifacts.startsWith(directory + "/"))
      await rm(directory, { recursive: true, force: true });
  }
}
