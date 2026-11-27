import assert from "node:assert/strict";
import test from "node:test";
import { demoPreviewEnabled, loadDemoPreview, readDemoCatalogue } from "../server/utils/demo-catalogue.ts";

test("demo preview requires development, opt-in, host and actual loopback transport", () => {
  const peer = "127.0.0.1";
  for (const host of ["localhost", "127.0.0.1:3000", "[::1]:3000"]) {
    assert.equal(demoPreviewEnabled(true, "1", host, peer, peer), true);
    assert.equal(demoPreviewEnabled(false, "1", host, peer, peer), false);
    assert.equal(demoPreviewEnabled(true, undefined, host, peer, peer), false);
    assert.equal(demoPreviewEnabled(true, "true", host, peer, peer), false);
  }
  for (const host of ["skyinnk.in", "localhost.evil.invalid", "127.0.0.1.evil.invalid", "192.168.1.5:3000", ""])
    assert.equal(demoPreviewEnabled(true, "1", host, peer, peer), false);
  for (const remote of ["192.168.1.5", "203.0.113.1", "::ffff:192.168.1.5", undefined])
    assert.equal(demoPreviewEnabled(true, "1", "localhost", remote, peer), false);
  for (const local of ["0.0.0.0", "192.168.1.5", undefined])
    assert.equal(demoPreviewEnabled(true, "1", "localhost", peer, local), false);
  for (const loopback of ["::1", "::ffff:127.0.0.1"])
    assert.equal(demoPreviewEnabled(true, "1", "localhost", loopback, loopback), true);
});

test("denied preview never invokes the database loader", async () => {
  let calls = 0;
  const load = async () => { calls++; return []; };
  for (const [dev, flag, host, peer, local] of [
    [false, "1", "localhost", "127.0.0.1", "127.0.0.1"],
    [true, undefined, "localhost", "127.0.0.1", "127.0.0.1"],
    [true, "1", "skyinnk.in", "127.0.0.1", "127.0.0.1"],
    [true, "1", "localhost", "192.168.1.5", "127.0.0.1"],
    [true, "1", "localhost", undefined, undefined],
  ]) {
    assert.deepEqual(await loadDemoPreview(dev, flag, host, peer, local, load), { enabled: false, courses: [] });
  }
  assert.equal(calls, 0);
  assert.deepEqual(await loadDemoPreview(true, "1", "localhost", "127.0.0.1", "127.0.0.1", load), { enabled: true, courses: [] });
  assert.equal(calls, 1);
});

test("demo reads only tagged bounded academic rows and returns explicitly projected learner data", async () => {
  let query;
  const rows = await readDemoCatalogue({ course: { async findMany(args) {
    query = args;
    return [{
      id: "private-id", reviewedBy: "private-user", sourceKey: "demo-sample", slug: "demo-sample",
      title: "[DEMO] Sample", summary: "Demo", audience: "Demo",
      subjects: [{ subject: { name: "Mathematics" } }],
      modules: [{ sourceKey: "demo-module", title: "Module", position: 0, lessons: [
        { sourceKey: "demo-lesson", slug: "lesson", title: "Lesson", position: 0, kind: "VIDEO", overview: "Demo", notesMarkdown: "## Notes", videoAssetId: "private-asset", video: { publicId: "not-approved" } }
      ] }]
    }];
  } } });
  assert.deepEqual(query.where, { sourceKey: { startsWith: "demo-" }, slug: { startsWith: "demo-" }, title: { startsWith: "[DEMO] " }, archivedAt: null });
  assert.equal(query.take, 20);
  assert.equal(query.select.modules.where.sourceKey.startsWith, "demo-");
  assert.equal(query.select.modules.select.lessons.where.sourceKey.startsWith, "demo-");
  assert.equal(query.select.modules.select.lessons.take, 100);
  assert.deepEqual(rows, [{
    key: "demo-sample", slug: "demo-sample", title: "[DEMO] Sample", summary: "Demo", audience: "Demo", subject: "Mathematics",
    modules: [{ key: "demo-module", title: "Module", position: 0, lessons: [{ key: "demo-lesson", slug: "lesson", title: "Lesson", position: 0, kind: "video", overview: "Demo", notesMarkdown: "## Notes" }] }]
  }]);
});
test("demo query failure is not substituted with JSON", async () => {
  await assert.rejects(readDemoCatalogue({ course: { async findMany() { throw new Error("database unavailable"); } } }), /database unavailable/);
});
