import assert from "node:assert/strict";
import test from "node:test";
import { demoPreviewEnabled, readDemoCatalogue } from "../server/utils/demo-catalogue.ts";

test("demo preview requires development, explicit opt-in and loopback host", () => {
  for (const host of ["localhost", "127.0.0.1:3000", "[::1]:3000"]) {
    assert.equal(demoPreviewEnabled(true, "1", host), true);
    assert.equal(demoPreviewEnabled(false, "1", host), false);
    assert.equal(demoPreviewEnabled(true, undefined, host), false);
    assert.equal(demoPreviewEnabled(true, "true", host), false);
  }
  for (const host of ["skyinnk.in", "localhost.evil.invalid", "127.0.0.1.evil.invalid", "192.168.1.5:3000", ""])
    assert.equal(demoPreviewEnabled(true, "1", host), false);
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
