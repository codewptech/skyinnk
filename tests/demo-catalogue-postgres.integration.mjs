import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import prisma from "../server/utils/prisma.ts";
import { readDemoCatalogue } from "../server/utils/demo-catalogue.ts";

// Never connect this test to an owner's database or production.
const fixtureUrl = "postgresql://fixture:fictional-only@127.0.0.1:55432/skyinnk_fixture";
assert.equal(process.env.DATABASE_URL, fixtureUrl);
assert.equal(process.env.DIRECT_URL, fixtureUrl);
const port = 4328;
const base = `http://127.0.0.1:${port}`;
let child;
let log = "";
const marker = "[DEMO] Disposable database course";
const privateMarker = "PRIVATE_NON_DEMO_DRAFT_SENTINEL";
const lessonMarker = "Disposable demo text lesson";
const videoMarker = "Disposable demo video lesson";

try {
  const course = await prisma.course.create({ data: {
    sourceKey: "demo-ci-course", slug: "demo-ci-course", title: marker,
    summary: "Fictional integration fixture only", audience: "Fixture audience",
  } });
  await prisma.course.create({ data: {
    sourceKey: "ci-private-draft", slug: "ci-private-draft", title: privateMarker,
  } });
  const subject = await prisma.subject.create({ data: { key: "demo-ci-subject", name: "Demo mathematics" } });
  await prisma.courseSubject.create({ data: { courseId: course.id, subjectId: subject.id, isPrimary: true } });
  const module = await prisma.module.create({ data: {
    courseId: course.id, sourceKey: "demo-ci-module", title: "Demo module", position: 0,
  } });
  await prisma.lesson.createMany({ data: [
    { courseId: course.id, moduleId: module.id, sourceKey: "demo-ci-text", slug: "text", title: lessonMarker,
      kind: "TEXT", position: 0, overview: "Fictional lesson", notesMarkdown: "## Demo notes" },
    { courseId: course.id, moduleId: module.id, sourceKey: "demo-ci-video", slug: "video", title: videoMarker,
      kind: "VIDEO", position: 1, overview: "Fictional video placeholder" },
    { courseId: course.id, moduleId: module.id, sourceKey: "ci-private-lesson", slug: "private", title: privateMarker,
      kind: "TEXT", position: 2 },
  ] });
  const projected = await readDemoCatalogue(prisma);
  assert.deepEqual(projected.map(c => c.slug), ["demo-ci-course"]);
  assert.deepEqual(projected[0].modules[0].lessons.map(l => l.slug), ["text", "video"]);
  assert.equal(projected[0].subject, "Demo mathematics");
  assert.equal(await prisma.courseRelease.count({ where: { courseId: course.id } }), 0);
  console.log("PASS actual PostgreSQL demo projection excludes unrelated drafts and has no release");

  child = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
    env: {
      ...process.env, NODE_ENV: "development", SKYINNK_DEMO_PREVIEW: "1",
      NUXT_AUTH0_DOMAIN: "validation.example.invalid",
      NUXT_AUTH0_CLIENT_ID: "validation",
      NUXT_AUTH0_CLIENT_SECRET: "fixture-client-secret-unusable",
      NUXT_AUTH0_SESSION_SECRET: "fixture-session-secret-32bytes-only",
      NUXT_AUTH0_APP_BASE_URL: base,
      NUXT_PUBLIC_ANALYTICS_ENABLED: "false",
    },
    detached: true, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => { log = (log + chunk).slice(-30000); });
  child.stderr.on("data", chunk => { log = (log + chunk).slice(-30000); });
  let ready = false;
  for (let i = 0; i < 180; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(base + "/api/v1/health", { signal: AbortSignal.timeout(3000) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  assert.ok(ready, "Disposable Nuxt dev server did not start");
  async function request(path, expected = 200, headers = {}) {
    const response = await fetch(base + path, { headers, signal: AbortSignal.timeout(30000), redirect: "manual" });
    const text = await response.text();
    assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status}; ${text.slice(0, 500)}`);
    assert.ok(!text.includes(privateMarker), "Private non-demo data escaped the projection");
    return { response, text };
  }
  const api = await request("/api/v1/development/catalogue");
  assert.equal(JSON.parse(api.text).enabled, true);
  assert.deepEqual(JSON.parse(api.text).courses.map(c => c.slug), ["demo-ci-course"]);
  assert.match(api.response.headers.get("cache-control") || "", /no-store/);
  assert.match(api.response.headers.get("x-robots-tag") || "", /noindex/);
  // Fetch may normalize a caller-supplied Host. Use the actual wire header.
  const denied = await new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: "127.0.0.1", port, path: "/api/v1/development/catalogue",
      headers: { Host: "invalid.example.test", "x-skyinnk-internal-demo-loopback": "a".repeat(64) } }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("Foreign host request timed out")));
    req.end();
  });
  if (denied.status === 200) assert.equal(JSON.parse(denied.body).enabled, false);
  else assert.ok([400, 403, 404].includes(denied.status), `unexpected denied status ${denied.status}`);
  assert.ok(!denied.body.includes(marker), "Foreign host received demo data");
  const publicApi = await request("/api/v1/public/courses");
  assert.ok(!publicApi.text.includes("demo-ci-course"));
  console.log("PASS actual local API, no-store/noindex, denied foreign host and no public draft exposure");

  for (const [path, expected] of [
    ["/courses", marker],
    ["/courses/demo-ci-course", marker],
    ["/courses/demo-ci-course/lessons/text", lessonMarker],
    ["/courses/demo-ci-course/lessons/video", videoMarker],
  ]) {
    const { response, text } = await request(path);
    assert.ok(text.includes(expected), `Missing database content at ${path}`);
    assert.match(text, /Development preview/i);
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
    if (path.endsWith("/video")) assert.match(text, /no video has been attached/i);
    if (path.endsWith("/text")) assert.ok(text.includes("demo-ci-course/lessons/video"), "Missing next lesson link");
  }
  await request("/courses/ci-private-draft", 404);
  await request("/courses/demo-ci-course/lessons/private", 404);
  console.log("PASS actual PostgreSQL → Nuxt development SSR catalogue, syllabus, text/video classroom and navigation");
} catch (error) {
  console.error(log);
  throw error;
} finally {
  if (child?.pid) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    for (let i = 0; i < 20 && child.exitCode === null; i++) await delay(100);
    try { process.kill(-child.pid, "SIGKILL"); } catch {}
  }
  await prisma.$disconnect();
}
