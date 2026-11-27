import test from "node:test";
import assert from "node:assert/strict";
import { listAcademicAuthoringCourses, parseAcademicCoursePage } from "../server/utils/academic-authoring-access.ts";

const row = (slug, permission, archivedAt = null) => ({
  id: `id-${slug}`, sourceKey: slug, slug, title: slug, summary: "draft", audience: "fixture",
  archivedAt, educators: permission ? [{ permission }] : [], _count: { modules: 1 },
  privateMemo: "never exposed", reviewedById: "private", auth0Id: "private",
});
function fixture({ actor = true, admin = false, assigned = true, rows = [] } = {}) {
  const calls = [];
  const tx = {
    user: { findUnique: async (q) => { calls.push(["user", q]); return actor ? { id: "actor-id", roles: admin ? [{roleId: "admin"}] : [] } : null; } },
    courseEducator: { findFirst: async (q) => { calls.push(["assignment", q]); return assigned ? {courseId: "scope"} : null; } },
    course: { findMany: async (q) => { calls.push(["courses", q]); return rows; } },
  };
  return { tx, calls };
}

test("academic course pagination accepts only bounded canonical scalar integers", () => {
  assert.deepEqual(parseAcademicCoursePage({}), {offset: 0, limit: 25});
  assert.deepEqual(parseAcademicCoursePage({offset: "100", limit: "1"}), {offset: 100, limit: 1});
  for (const query of [{actorId: "spoof"}, {limit: "0"}, {limit: "101"}, {limit: ["1", "2"]}, {limit: 1}, {offset: "-1"}, {offset: "01"}, {offset: "100001"}, {offset: "1e3"}, {limit: " 2"}]) {
    assert.throws(() => parseAcademicCoursePage(query), {statusCode: 400});
  }
});

test("unmapped subject or unassigned user cannot read academic drafts", async () => {
  for (const options of [{actor: false}, {assigned: false}]) {
    const {tx, calls} = fixture(options);
    await assert.rejects(listAcademicAuthoringCourses(tx, "auth0|fixture", {}), {statusCode: 403});
    assert.ok(!calls.some(([name]) => name === "courses"));
  }
  const {tx, calls} = fixture();
  await assert.rejects(listAcademicAuthoringCourses(tx, "", {}), {statusCode: 403});
  await assert.rejects(listAcademicAuthoringCourses(tx, "auth0|fixture", {actorId: "spoof"}), {statusCode: 400});
  assert.equal(calls.length, 0);
});

test("educator lookup binds the verified subject and filters courses by explicit database permission", async () => {
  const {tx, calls} = fixture({rows: [row("editor", "EDITOR"), row("reviewer", "REVIEWER"), row("both", "EDITOR_REVIEWER"), row("archived", "EDITOR_REVIEWER", new Date("2026-01-01T00:00:00Z"))]});
  const result = await listAcademicAuthoringCourses(tx, "auth0|fixture", {});
  assert.equal(result.canCreateCourse, false);
  assert.deepEqual(calls[0][1].where, {auth0Id: "auth0|fixture"});
  assert.deepEqual(calls[0][1].select.roles.where, {role: {key: "academic-admin"}});
  const scope = {userId: "actor-id", permission: {in: ["EDITOR", "REVIEWER", "EDITOR_REVIEWER"]}};
  assert.deepEqual(calls[1][1].where, scope);
  assert.deepEqual(calls[2][1].where, {educators: {some: scope}});
  assert.deepEqual(calls[2][1].select.educators.where, scope);
  assert.deepEqual(result.courses.map(x => [x.canEdit, x.canReview]), [[true,false],[false,true],[true,true],[false,false]]);
  for (const key of ["educators", "privateMemo", "reviewedById", "auth0Id"]) assert.ok(!JSON.stringify(result).includes(key));
});

test("only the database admin role allows unscoped course listing; results are bounded", async () => {
  const {tx, calls} = fixture({admin: true, assigned: false, rows: [row("a"), row("b"), row("c")]});
  const result = await listAcademicAuthoringCourses(tx, "auth0|admin", {offset: "8", limit: "2"});
  assert.equal(result.canCreateCourse, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1][1].where, {});
  assert.deepEqual(calls[1][1].orderBy, {slug: "asc"});
  assert.equal(calls[1][1].skip, 8);
  assert.equal(calls[1][1].take, 3);
  assert.deepEqual(result.courses.map(x => [x.slug,x.canEdit,x.canReview]), [["a",true,true],["b",true,true]]);
  assert.deepEqual(result.page, {offset:8,limit:2,nextOffset:10});
});

test("no rows is a valid authorized empty page", async () => {
  const {tx} = fixture({admin: true});
  const result = await listAcademicAuthoringCourses(tx, "auth0|admin", {});
  assert.deepEqual(result, {canCreateCourse:true,courses:[],page:{offset:0,limit:25,nextOffset:null}});
});
