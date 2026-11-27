import assert from "node:assert/strict";
import test from "node:test";
import { developmentCatalogueAllowed, developmentCatalogueAuthorized, developmentProofHeader, markDevelopmentIngress, loadDevelopmentCatalogue, readDevelopmentCatalogue } from "../server/utils/demo-catalogue.ts";

test("demo preview requires development, host and actual loopback transport", () => {
  const peer = "127.0.0.1";
  for (const host of ["localhost", "127.0.0.1:3000", "[::1]:3000"]) {
    assert.equal(developmentCatalogueAllowed(true, host, peer, peer), true);
    assert.equal(developmentCatalogueAllowed(false, host, peer, peer), false);
  }
  for (const host of ["skyinnk.in", "localhost.evil.invalid", "127.0.0.1.evil.invalid", "192.168.1.5:3000", ""])
    assert.equal(developmentCatalogueAllowed(true, host, peer, peer), false);
  for (const remote of ["192.168.1.5", "203.0.113.1", "::ffff:192.168.1.5", undefined])
    assert.equal(developmentCatalogueAllowed(true, "localhost", remote, peer), false);
  for (const local of ["0.0.0.0", "192.168.1.5", undefined])
    assert.equal(developmentCatalogueAllowed(true, "localhost", peer, local), false);
  for (const loopback of ["::1", "::ffff:127.0.0.1"])
    assert.equal(developmentCatalogueAllowed(true, "localhost", loopback, loopback), true);
});

test("outer ingress strips forged proof and only marks actual loopback listener and request", () => {
  const token = "a".repeat(64);
  const request = (remoteAddress, localAddress, host = "localhost") => ({
    headers: { host, [developmentProofHeader]: "forged" },
    rawHeaders: ["Host", host, "X-Skyinnk-Internal-Catalogue-Loopback", "forged"],
    socket: { remoteAddress, localAddress },
  });
  for (const [listener, peer, local, host] of [
    ["0.0.0.0", "127.0.0.1", "127.0.0.1", "localhost"],
    ["127.0.0.1", "192.168.1.4", "127.0.0.1", "localhost"],
    ["127.0.0.1", "127.0.0.1", undefined, "localhost"],
    ["127.0.0.1", "127.0.0.1", "127.0.0.1", "external.invalid"],
  ]) {
    const req = request(peer, local, host);
    markDevelopmentIngress(req, listener, token);
    assert.equal(req.headers[developmentProofHeader], undefined);
    assert.equal(req.rawHeaders.length, 2);
  }
  const allowed = request("127.0.0.1", "127.0.0.1");
  markDevelopmentIngress(allowed, "127.0.0.1", token);
  assert.equal(allowed.headers[developmentProofHeader], token);
  assert.deepEqual(allowed.rawHeaders.slice(2), [developmentProofHeader, token]);
});

test("denied worker preview never invokes database loader", async () => {
  const token = "a".repeat(64);
  let calls = 0;
  const load = async () => { calls++; return []; };
  for (const [dev, host, proof, secret] of [
    [false, "localhost", token, token],
    [true, "skyinnk.in", token, token],
    [true, "localhost", "b".repeat(64), token],
    [true, "localhost", undefined, token],
    [true, "localhost", token, undefined],
    [true, "localhost", "forged", "forged"],
  ]) {
    assert.equal(developmentCatalogueAuthorized(dev, host, proof, secret), false);
    assert.deepEqual(await loadDevelopmentCatalogue(dev, host, proof, secret, load), { enabled: false, courses: [] });
  }
  assert.equal(calls, 0);
  assert.deepEqual(await loadDevelopmentCatalogue(true, "localhost", token, token, load), { enabled: true, courses: [] });
  assert.equal(calls, 1);
});

test("ordinary nonarchived academic rows are read without demo filtering and return explicit learner data", async () => {
  let query;
  const rows = await readDevelopmentCatalogue({ course: { async findMany(args) {
    query = args;
    return [{
      id: "private-id", reviewedBy: "private-user", sourceKey: "ordinary-course", slug: "ordinary-course",
      title: "Ordinary course", summary: "Demo", audience: "Demo",
      subjects: [{ subject: { name: "Mathematics" } }],
      modules: [{ sourceKey: "ordinary-module", title: "Module", position: 0, lessons: [
        { sourceKey: "ordinary-lesson", slug: "lesson", title: "Lesson", position: 0, kind: "VIDEO", overview: "Demo", notesMarkdown: "## Notes", videoAssetId: "private-asset", video: { publicId: "not-approved" } }
      ] }]
    }];
  } } });
  assert.deepEqual(query.where, { archivedAt: null });
  assert.equal(query.take, undefined);
  assert.equal(query.select.modules.where, undefined);
  assert.equal(query.select.modules.take, undefined);
  assert.equal(query.select.modules.select.lessons.where, undefined);
  assert.equal(query.select.modules.select.lessons.take, undefined);
  assert.deepEqual(query.select.subjects.where, { isPrimary: true, subject: { archivedAt: null } });
  assert.deepEqual(rows, [{
    key: "ordinary-course", slug: "ordinary-course", title: "Ordinary course", summary: "Demo", audience: "Demo", subject: "Mathematics",
    modules: [{ key: "ordinary-module", title: "Module", position: 0, lessons: [{ key: "ordinary-lesson", slug: "lesson", title: "Lesson", position: 0, kind: "video", overview: "Demo", notesMarkdown: "## Notes" }] }]
  }]);
});
test("demo query failure is not substituted with JSON", async () => {
  await assert.rejects(readDevelopmentCatalogue({ course: { async findMany() { throw new Error("database unavailable"); } } }), /database unavailable/);
});
