// Real disposable PostgreSQL 18 only; migration and database integrity checks.
import assert from "node:assert/strict";
import prisma from "../server/utils/prisma.ts";
const url = new URL(process.env.DATABASE_URL || "");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55432");
assert.equal(url.pathname, "/skyinnk_fixture");
assert.equal(process.env.DIRECT_URL, process.env.DATABASE_URL);
const expectReject = (fn, code) => assert.rejects(fn, error => error.code === code, "Database must reject the expected unique or foreign-key violation");
const expectCheck = (fn, constraint) => assert.rejects(fn, error => {
  // Prisma 6 can surface PostgreSQL CHECK errors as UnknownRequestError.
  // Match BOTH the SQLSTATE and the exact constraint, never unrelated failures.
  const message = String(error.message);
  const postgres = message.includes('code: "23514"') || error.meta?.code === "23514";
  const named = message.includes('violates check constraint \\"' + constraint + '\\"') ||
    message.includes('violates check constraint "' + constraint + '"') ||
    String(error.meta?.message ?? "").includes('violates check constraint "' + constraint + '"');
  return postgres && named;
}, "Expected PostgreSQL 23514 for " + constraint);
try {
  const existing = await prisma.user.findUniqueOrThrow({ where: { auth0Id: "fixture|pre-academic-upgrade" } });
  assert.equal(existing.id, "019abcd0-0000-7000-8000-000000000001");
  assert.equal(existing.name, "Existing fictional identity");
  assert.equal(await prisma.userRole.count(), 0);
  assert.equal(await prisma.courseEducator.count(), 0);
  const c = await prisma.course.create({ data: { sourceKey:"math-a",slug:"class10-math",title:"Fictional Mathematics" } });
  const other = await prisma.course.create({ data: { sourceKey:"math-b",slug:"another-course",title:"Fictional other course" } });
  const category = await prisma.academicCategory.create({data:{key:"school",name:"School"}});
  const level = await prisma.academicLevel.create({data:{key:"class-10",name:"Class 10"}});
  const curriculum = await prisma.curriculum.create({data:{key:"fixture-board",name:"Fictional curriculum"}});
  const subject = await prisma.subject.create({data:{key:"math",name:"Mathematics"}});
  const secondSubject = await prisma.subject.create({data:{key:"english",name:"English"}});
  for(const row of [c,other,category,level,curriculum,subject,secondSubject]) assert.equal(row.id.split("-")[2][0],"7");
  await prisma.courseCategory.create({data:{courseId:c.id,categoryId:category.id,isPrimary:true}});
  await prisma.courseLevel.create({data:{courseId:c.id,levelId:level.id}});
  await prisma.courseCurriculum.create({data:{courseId:c.id,curriculumId:curriculum.id}});
  await prisma.courseSubject.create({data:{courseId:c.id,subjectId:subject.id,isPrimary:true}});
  await expectReject(()=>prisma.courseSubject.create({data:{courseId:c.id,subjectId:secondSubject.id,isPrimary:true}}), "P2002");
  await prisma.courseSubject.create({data:{courseId:c.id,subjectId:secondSubject.id}});
  await expectReject(()=>prisma.courseSubject.create({data:{courseId:c.id,subjectId:subject.id}}), "P2002");
  await expectReject(()=>prisma.course.create({data:{sourceKey:"duplicate-slug",slug:c.slug,title:"Duplicate"}}), "P2002");
  console.log("PASS existing User preserved, native UUIDv7, taxonomy junctions, unique slugs and one primary subject");
  const root = await prisma.topic.create({data:{key:"numbers",name:"Numbers"}});
  const topic = await prisma.topic.create({data:{key:"real-numbers",name:"Real numbers",parentId:root.id}});
  await prisma.subjectTopic.create({data:{subjectId:subject.id,topicId:topic.id}});
  await expectCheck(()=>prisma.topic.update({where:{id:root.id},data:{parentId:root.id}}), "Topic_not_self_check");
  const mod = await prisma.module.create({data:{courseId:c.id,sourceKey:"module-a",title:"Module A",position:0}});
  const mod2 = await prisma.module.create({data:{courseId:c.id,sourceKey:"module-b",title:"Module B",position:1}});
  await expectReject(()=>prisma.module.create({data:{courseId:c.id,sourceKey:"duplicate-pos",title:"Duplicate",position:0}}), "P2002");
  await expectCheck(()=>prisma.module.create({data:{courseId:c.id,sourceKey:"bad-pos",title:"Bad",position:-1}}), "Module_position_check");
  const lesson = await prisma.lesson.create({data:{courseId:c.id,moduleId:mod.id,sourceKey:"lesson-a",slug:"intro",title:"Introduction",position:0,notesMarkdown:"## Example\nFictional learning material."}});
  await prisma.lessonTopic.create({data:{lessonId:lesson.id,topicId:topic.id}});
  await expectReject(()=>prisma.lesson.create({data:{courseId:other.id,moduleId:mod.id,sourceKey:"wrong-course",slug:"wrong",title:"Wrong context",position:2}}), "P2003");
  await expectReject(()=>prisma.lesson.create({data:{courseId:c.id,moduleId:mod2.id,sourceKey:"duplicate-lesson-slug",slug:"intro",title:"Duplicate slug",position:0}}), "P2002");
  await expectReject(()=>prisma.lesson.create({data:{courseId:c.id,moduleId:mod.id,sourceKey:"duplicate-lesson-pos",slug:"different",title:"Duplicate position",position:0}}), "P2002");
  await expectReject(()=>prisma.course.delete({where:{id:c.id}}), "P2003");
  await expectReject(()=>prisma.module.delete({where:{id:mod.id}}), "P2003");
  console.log("PASS topic relationship, scoped ordering, course-wide lesson slug, cross-course FK and restricted deletion");
  const hash = "a".repeat(64);
  const media = await prisma.mediaAsset.create({data:{provider:"LOCAL_PRIVATE",externalKey:hash,sha256:hash,mimeType:"application/pdf",sizeBytes:10}});
  const video = await prisma.mediaAsset.create({data:{provider:"YOUTUBE",externalKey:"abcdefghijk"}});
  const resource = await prisma.learningResource.create({data:{sourceKey:"worksheet",title:"Worksheet",mediaAssetId:media.id}});
  await prisma.courseResource.create({data:{courseId:c.id,resourceId:resource.id,position:0}});
  await prisma.lessonResource.create({data:{lessonId:lesson.id,resourceId:resource.id,position:0}});
  await expectCheck(()=>prisma.mediaAsset.create({data:{provider:"LOCAL_PRIVATE",externalKey:"b".repeat(64),sha256:hash,mimeType:"application/pdf",sizeBytes:10}}), "MediaAsset_provider_check");
  await expectCheck(()=>prisma.mediaAsset.create({data:{provider:"YOUTUBE",externalKey:"https://invalid.example"}}), "MediaAsset_provider_check");
  await expectCheck(()=>prisma.lesson.update({where:{id:lesson.id},data:{videoAssetId:video.id}}), "Lesson_kind_check");
  await prisma.lesson.update({where:{id:lesson.id},data:{kind:"VIDEO",videoAssetId:video.id}});
  await expectReject(()=>prisma.mediaAsset.delete({where:{id:media.id}}), "P2003");
  await expectReject(()=>prisma.learningResource.delete({where:{id:resource.id}}), "P2003");
  const role = await prisma.role.create({data:{key:"academic-admin",name:"Academic admin"}});
  await prisma.userRole.create({data:{userId:existing.id,roleId:role.id}});
  await prisma.courseEducator.create({data:{courseId:c.id,userId:existing.id,permission:"EDITOR"}});
  await expectCheck(()=>prisma.courseEducator.create({data:{courseId:other.id,userId:existing.id,permission:"OWNER_FROM_BROWSER"}}), "CourseEducator_permission_check");
  await expectReject(()=>prisma.userRole.create({data:{userId:existing.id,roleId:role.id}}), "P2002");
  const before = await prisma.course.findUniqueOrThrow({where:{id:c.id}});
  await new Promise(resolve=>setTimeout(resolve,10));
  await prisma.$executeRawUnsafe('UPDATE "Course" SET "title" = $1 WHERE "id" = $2::uuid',"Updated fictional title",c.id);
  const after=await prisma.course.findUniqueOrThrow({where:{id:c.id}});
  assert.equal(after.id,before.id);
  assert.ok(after.updatedAt>before.updatedAt);
  console.log("PASS media metadata constraints, resource reuse, no automatic roles, scoped educator permission and database timestamp");
} finally {
  await prisma.$disconnect();
}
