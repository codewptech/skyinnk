import assert from "node:assert/strict";
import test from "node:test";
import { demoPreviewEnabled, demoPreviewAuthorized, demoProofHeader, markDemoIngress, loadDemoPreview, readDemoCatalogue } from "../server/utils/demo-catalogue.ts";

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

test("outer ingress strips forged proof and only marks actual loopback listener and request", () => {
  const token = "a".repeat(64);
  const request = (remoteAddress, localAddress, host = "localhost") => ({
    headers: { host, [demoProofHeader]: "forged" },
    rawHeaders: ["Host", host, "X-Skyinnk-Internal-Demo-Loopback", "forged"],
    socket: { remoteAddress, localAddress },
  });
  for (const [listener, peer, local, host] of [
    ["0.0.0.0", "127.0.0.1", "127.0.0.1", "localhost"],
    ["127.0.0.1", "192.168.1.4", "127.0.0.1", "localhost"],
    ["127.0.0.1", "127.0.0.1", undefined, "localhost"],
    ["127.0.0.1", "127.0.0.1", "127.0.0.1", "external.invalid"],
  ]) {
    const req = request(peer, local, host);
    markDemoIngress(req, listener, "1", token);
    assert.equal(req.headers[demoProofHeader], undefined);
    assert.equal(req.rawHeaders.length, 2);
  }
  const allowed = request("127.0.0.1", "127.0.0.1");
  markDemoIngress(allowed, "127.0.0.1", "1", token);
  assert.equal(allowed.headers[demoProofHeader], token);
  assert.deepEqual(allowed.rawHeaders.slice(2), [demoProofHeader, token]);
});

test("denied worker preview never invokes database loader", async () => {
  const token = "a".repeat(64);
  let calls = 0;
  const load = async () => { calls++; return []; };
  for (const [dev, flag, host, proof, secret] of [
    [false, "1", "localhost", token, token],
    [true, undefined, "localhost", token, token],
    [true, "1", "skyinnk.in", token, token],
    [true, "1", "localhost", "b".repeat(64), token],
    [true, "1", "localhost", undefined, token],
    [true, "1", "localhost", token, undefined],
    [true, "1", "localhost", "forged", "forged"],
  ]) {
    assert.equal(demoPreviewAuthorized(dev, flag, host, proof, secret), false);
    assert.deepEqual(await loadDemoPreview(dev, flag, host, proof, secret, load), { enabled: false, courses: [] });
  }
  assert.equal(calls, 0);
  assert.deepEqual(await loadDemoPreview(true, "1", "localhost", token, token, load), { enabled: true, courses: [] });
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
