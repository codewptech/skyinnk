/**
 * Opt-in HTTP contract check against the disposable production fixture.
 * Terminal 1: node scripts/smoke-v1.mjs --isolated-fixture --http-only --serve-fixture --artifacts /absolute/temp/evidence
 * Terminal 2, after FIXTURE_READY: node scripts/smoke-public-api-contract.mjs
 * Use the same --port on both commands to select a different local port.
 * Send "stop" to terminal 1 when finished. Use a fresh temp evidence directory.
 */
import assert from "node:assert/strict";

const [option, port = "4319", ...extra] = process.argv.slice(2);
assert.ok(
  (option === undefined || option === "--port") &&
    extra.length === 0 &&
    /^\d+$/.test(port) &&
    Number(port) > 0 &&
    Number(port) <= 65535,
  "Usage: node scripts/smoke-public-api-contract.mjs [--port PORT]",
);
const origin = `http://127.0.0.1:${Number(port)}`;
const cataloguePath = "/api/v1/public/courses";
const coursePath = `${cataloguePath}/fixture-course`;
const resourceText = "AUTOMATED TEST FIXTURE. Not educational content.\n";

async function request(path, status, contentType) {
  const response = await fetch(origin + path, {
    headers: { accept: contentType },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, status, path);
  assert.equal(
    response.headers.get("content-type")?.split(";")[0],
    contentType,
    path,
  );
  return response;
}

async function json(path, status = 200) {
  const response = await request(path, status, "application/json");
  assert.match(
    response.headers.get("cache-control") ?? "",
    /\bno-store\b/,
    path,
  );
  return response.json();
}

const course = {
  key: "fixture-course",
  slug: "fixture-course",
  title: "Automated fixture course",
  summary: "Test fixture only. Not approved educational content.",
  audience: "Test automation",
  subject: "Testing",
};
const overview =
  "Automated interface test fixture, never a reviewed educational lesson.";
const video = {
  key: "fixture-video",
  slug: "video-test",
  title: "Fixture video lesson",
  kind: "video",
  position: 0,
  overview,
};
const text = {
  key: "fixture-text",
  slug: "text-test",
  title: "Fixture text lesson",
  kind: "text",
  position: 0,
  overview,
};

const firstModule = {
  key: "fixture-module-one",
  title: "Fixture module one",
  position: 0,
};
const secondModule = {
  key: "fixture-module-two",
  title: "Fixture module two",
  position: 1,
};

assert.deepEqual(await json(cataloguePath), {
  courses: [{ ...course, moduleCount: 2, lessonCount: 2 }],
});
assert.deepEqual(await json(coursePath), {
  course: {
    ...course,
    modules: [
      { ...firstModule, lessons: [video] },
      { ...secondModule, lessons: [text] },
    ],
  },
});
console.log(
  "PASS catalogue and ordered outline contain only the contracted public fields",
);

const lessonCourse = {
  key: course.key,
  slug: course.slug,
  title: course.title,
  subject: course.subject,
};
const notesMarkdown =
  "## Fixture notes\n\nFixture notes marker\n\n| Item | Value |\n| --- | --- |\n| Test | 2 |\n\n$x^2$\n\n<script>window.fixtureXss=true</script>\n\n[unsafe](javascript:alert(1))\n\n\n| A | B | C | D | E | F | G | H |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |\n\n\n$$x=1$$\n\n$$x_{0}+x_{1}+x_{2}+x_{3}+x_{4}+x_{5}+x_{6}+x_{7}+x_{8}+x_{9}+x_{10}+x_{11}$$\n\n```text\nshort\n```\n\n```text\n12345678901234567890123456789012345678901234567890123456789012345678901234567890\n```\n";
const resource = {
  key: "fixture-resource",
  title: "Fixture text resource",
  url: "/resources/public/fixture.txt",
  type: "TXT",
  sizeBytes: Buffer.byteLength(resourceText),
};
const imageResource = {
  key: "fixture-image",
  title: "Fixture notes diagram",
  url: "/resources/public/fixture.png",
  type: "PNG",
  sizeBytes: 73,
};
assert.deepEqual(await json(`${coursePath}/lessons/${video.slug}`), {
  course: lessonCourse,
  module: firstModule,
  lesson: {
    ...video,
    notesMarkdown:
      notesMarkdown +
      "\n![Diagram of $$x^2$$ with [linked text](/resources/public/description-only.txt)](/resources/public/fixture.png)\n\n" +
      "[Invalid fixture destination](https://example.invalid%3Ftext)\n",
    video: { provider: "youtube", publicId: "abcdefghijk" },
    resources: [resource, imageResource],
  },
});
assert.deepEqual(await json(`${coursePath}/lessons/${text.slug}`), {
  course: lessonCourse,
  module: secondModule,
  lesson: { ...text, notesMarkdown, resources: [] },
});
console.log(
  "PASS video and text lessons expose only the contracted notes, media and resource fields",
);

// The release manifest contains published content only. Unpublished slugs
// therefore have the same HTTP behavior as unknown slugs.
for (const path of [
  `${cataloguePath}/unpublished-course`,
  `${cataloguePath}/unpublished-course/lessons/${video.slug}`,
  `${cataloguePath}/FIXTURE-COURSE`,
  `${coursePath}/lessons/unpublished-lesson`,
  `${coursePath}/lessons/VIDEO-TEST`,
  `${coursePath}/lessons/fixture%2Fprivate`,
]) {
  const error = await json(path, 404);
  assert.equal(error.statusCode, 404, path);
  assert.equal(error.course, undefined, path);
  assert.equal(error.lesson, undefined, path);
}
console.log(
  "PASS missing, unpublished and malformed slugs return 404 without course or lesson data",
);

const webCoursePath = `/courses/${course.slug}`;
for (const [path, title] of [
  [webCoursePath, course.title],
  ...[video, text].map((lesson) => [
    `${webCoursePath}/lessons/${lesson.slug}`,
    lesson.title,
  ]),
]) {
  const response = await request(path, 200, "text/html");
  assert.ok((await response.text()).includes(title), path);
}
const asset = await request(resource.url, 200, "text/plain");
assert.equal(await asset.text(), resourceText);
const image = await request(imageResource.url, 200, "image/png");
assert.equal((await image.arrayBuffer()).byteLength, imageResource.sizeBytes);
console.log(
  "PASS API slugs match rendered pages and the public resource in the same production build",
);
