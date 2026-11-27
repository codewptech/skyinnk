import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import prisma from "./prisma.ts";
import { academicResourcePath, readAcademicAsset } from "./academic-private-media.ts";
import { checkFinalNoteSource } from "../../scripts/validate-public-content.ts";
import { markdownResourcePaths } from "../../app/utils/render-markdown.ts";
import { validatePublicCatalogue, type PublicCourse } from "../../shared/public-content.ts";

type PublicationCode = "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "STALE";
export class AcademicPublicationError extends Error {
  readonly code: PublicationCode;
  constructor(code: PublicationCode, message: string) { super(message); this.code=code; this.name="AcademicPublicationError"; }
}
function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AcademicPublicationError("INVALID",message);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function lockCourse(tx: Prisma.TransactionClient, courseId: string) {
  if (!uuid.test(courseId)) throw new AcademicPublicationError("NOT_FOUND","Course unavailable");
  const rows = await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "Course" WHERE "id"=${courseId}::uuid FOR UPDATE`;
  if (!rows.length) throw new AcademicPublicationError("NOT_FOUND","Course unavailable");
}
/** Caller must derive actorId from the verified Auth0 subject, never request JSON. */
async function authorize(tx: Prisma.TransactionClient, actorId: string, courseId: string, publishing: boolean) {
  if (!uuid.test(actorId) || !uuid.test(courseId)) throw new AcademicPublicationError("FORBIDDEN","Academic permission required");
  const admin=await tx.userRole.findFirst({where:{userId:actorId,role:{key:"academic-admin"}},select:{userId:true}});
  if (admin) return;
  const assignment=await tx.courseEducator.findUnique({where:{courseId_userId:{courseId,userId:actorId}},select:{permission:true}});
  if (!assignment || (publishing && !["REVIEWER","EDITOR_REVIEWER"].includes(assignment.permission)))
    throw new AcademicPublicationError("FORBIDDEN","Academic permission required");
}
type ResourceDraft = {id:string;sourceKey:string;title:string;mediaAsset:{provider:string;externalKey:string;sha256:string|null;mimeType:string|null;sizeBytes:number|null}};
type ResourceSnapshot = {resourceId:string;sourceKey:string;title:string;position:number;mimeType:string;sizeBytes:number;sha256:string};
type Classification = {kind:string;key:string;name:string;isPrimary:boolean};
const ordered = (a:Classification,b:Classification) => a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

async function snapshot(tx: Prisma.TransactionClient, courseId: string, root: string) {
  const c=await tx.course.findUnique({where:{id:courseId},include:{
    categories:{include:{category:true}},levels:{include:{level:true}},curricula:{include:{curriculum:true}},subjects:{include:{subject:true}},
    resources:{orderBy:{position:"asc"},include:{resource:{include:{mediaAsset:true}}}},
    modules:{orderBy:{position:"asc"},include:{lessons:{orderBy:{position:"asc"},include:{videoAsset:true,resources:{orderBy:{position:"asc"},include:{resource:{include:{mediaAsset:true}}}}}}}}
  }});
  if (!c || c.archivedAt) throw new AcademicPublicationError("NOT_FOUND","Course unavailable");
  demand(c.modules.length > 0 && c.modules.length <= 100, "Course must have 1–100 reviewed modules");
  demand(c.modules.reduce((n,m)=>n+m.lessons.length,0)<=1000,"Course lesson limit exceeded");
  const primary=c.subjects.find(s=>s.isPrimary && !s.subject.archivedAt);
  demand(primary,"A primary active subject is required");
  const classifications:Classification[]=[];
  for (const [kind,rows] of [
    ["CATEGORY",c.categories.map(x=>({item:x.category,primary:x.isPrimary}))],
    ["LEVEL",c.levels.map(x=>({item:x.level,primary:false}))],
    ["CURRICULUM",c.curricula.map(x=>({item:x.curriculum,primary:false}))],
    ["SUBJECT",c.subjects.map(x=>({item:x.subject,primary:x.isPrimary}))],
  ] as const) {
    for(const {item,primary:isPrimary} of rows) {
      demand(!item.archivedAt,"Archived academic classification cannot be published");
      classifications.push({kind,key:item.key,name:item.name,isPrimary});
    }
  }
  classifications.sort(ordered);
  const active=await tx.courseRelease.findFirst({where:{courseId,state:"ACTIVE"},select:{id:true}});
  const seenMedia=new Set<string>();
  let totalBytes=0,links=0;
  async function resource(r:ResourceDraft, position:number):Promise<ResourceSnapshot> {
    const m=r.mediaAsset;
    demand(m.provider==="LOCAL_PRIVATE" && m.sha256 && m.sha256===m.externalKey && m.mimeType && m.sizeBytes,"Resource must reference a private approved file");
    demand(++links<=500,"Resource link limit exceeded");
    if (!seenMedia.has(m.sha256)) {
      totalBytes+=m.sizeBytes; demand(totalBytes<=100_000_000,"Course resource byte limit exceeded");
      try { await readAcademicAsset(root,m.sha256,m.sizeBytes,m.mimeType); }
      catch { throw new AcademicPublicationError("INVALID","Resource bytes do not match the selected file"); }
      seenMedia.add(m.sha256);
    }
    return {resourceId:r.id,sourceKey:r.sourceKey,title:r.title,position,mimeType:m.mimeType,sizeBytes:m.sizeBytes,sha256:m.sha256};
  }
  const resources:ResourceSnapshot[]=[];
  for(const x of c.resources) resources.push(await resource(x.resource,x.position));
  const modules=[];
  for(const m of c.modules) {
    demand(m.lessons.length>0,"Every released module needs a lesson");
    const lessons=[];
    for(const l of m.lessons) {
      const items:ResourceSnapshot[]=[];
      for(const x of l.resources) items.push(await resource(x.resource,x.position));
      demand(l.kind==="TEXT" || l.kind==="VIDEO","Invalid lesson kind");
      const videoPublicId=l.videoAsset?.provider==="YOUTUBE"?l.videoAsset.externalKey:null;
      demand(l.kind==="VIDEO"?!!videoPublicId:l.videoAsset===null,"Video lesson requires a reviewed YouTube asset; text cannot contain video");
      try {
        checkFinalNoteSource(l.notesMarkdown,"Lesson notes");
        const paths=new Set(items.map(x=>academicResourcePath(x.sha256,x.mimeType)));
        for(const path of markdownResourcePaths(l.notesMarkdown)) demand(paths.has(path),"Notes reference an unlisted resource");
      } catch(e) { if(e instanceof AcademicPublicationError) throw e; throw new AcademicPublicationError("INVALID","Lesson notes failed rendering validation"); }
      lessons.push({lessonId:l.id,sourceKey:l.sourceKey,slug:l.slug,title:l.title,position:l.position,kind:l.kind,overview:l.overview,notesMarkdown:l.notesMarkdown,videoPublicId,resources:items});
    }
    modules.push({moduleId:m.id,sourceKey:m.sourceKey,title:m.title,position:m.position,lessons});
  }
  const data={courseId,baseReleaseId:active?.id??null,sourceKey:c.sourceKey,slug:c.slug,title:c.title,summary:c.summary,audience:c.audience,subject:primary.subject.name,classifications,resources,modules};
  // Reuse the existing public contract for draft technical validation. These
  // markers are internal validation-only, NEVER persisted as approval or served.
  const validation={status:"published" as const,visibility:"public" as const,reviewedBy:"internal-validation-only",reviewedAt:"2000-01-01T00:00:00Z"};
  const asResource=(r:ResourceSnapshot)=>({key:r.sourceKey,title:r.title,url:academicResourcePath(r.sha256,r.mimeType),type:academicResourcePath(r.sha256,r.mimeType).split(".").at(-1)!.toUpperCase(),sizeBytes:r.sizeBytes,sha256:r.sha256,publication:validation});
  const publicShape:PublicCourse={key:data.sourceKey,slug:data.slug,title:data.title,summary:data.summary,audience:data.audience,subject:data.subject,publication:validation,modules:modules.map(m=>({key:m.sourceKey,title:m.title,position:m.position,lessons:m.lessons.map(l=>({key:l.sourceKey,slug:l.slug,title:l.title,position:l.position,kind:l.kind==="VIDEO"?"video":"text",overview:l.overview,notesMarkdown:l.notesMarkdown,publication:validation,...(l.videoPublicId?{video:{provider:"youtube" as const,publicId:l.videoPublicId}}:{}),resources:l.resources.map(asResource)}))}))};
  try { validatePublicCatalogue({schemaVersion:1,courses:[publicShape]}); }
  catch { throw new AcademicPublicationError("INVALID","Course does not meet the public content contract"); }
  const digest=createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return {data,digest};
}
const txOptions={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:60_000,maxWait:5_000};
async function transaction<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
  try { return await prisma.$transaction(work,txOptions); }
  catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && ["P2034","P2002"].includes(error.code)) throw new AcademicPublicationError("STALE","Academic data changed; review again");
    throw error;
  }
}
export async function previewAcademicPublication(actorId:string,courseId:string,storageRoot:string) {
  return transaction(async tx=>{
    await authorize(tx,actorId,courseId,false);
    return snapshot(tx,courseId,storageRoot);
  });
}
export async function publishAcademicCourse(actorId:string,courseId:string,expectedDigest:string,rightsConfirmed:boolean,storageRoot:string) {
  demand(rightsConfirmed===true && /^[a-f0-9]{64}$/.test(expectedDigest),"Explicit educator and rights confirmation is required");
  return transaction(async tx=>{
    await authorize(tx,actorId,courseId,true);
    await lockCourse(tx,courseId);
    const {data,digest}=await snapshot(tx,courseId,storageRoot);
    if(digest!==expectedDigest) throw new AcademicPublicationError("STALE","Draft or active release changed; review again");
    const prior=await tx.courseRelease.findFirst({where:{courseId},orderBy:{version:"desc"},select:{version:true}});
    const release=await tx.courseRelease.create({data:{
      courseId,version:(prior?.version??0)+1,state:"STAGED",sourceKey:data.sourceKey,slug:data.slug,title:data.title,summary:data.summary,audience:data.audience,subject:data.subject,contentDigest:digest,reviewedById:actorId,rightsConfirmed:true
    }});
    await tx.publishedClassification.createMany({data:data.classifications.map(c=>({...c,releaseId:release.id}))});
    for(const r of data.resources) await tx.publishedCourseResource.create({data:{...r,releaseId:release.id}});
    for(const m of data.modules) {
      const {lessons,...fields}=m;
      const module=await tx.publishedModule.create({data:{...fields,releaseId:release.id,courseId}});
      for(const l of lessons) {
        const {resources,...fields}=l;
        const lesson=await tx.publishedLesson.create({data:{...fields,releaseId:release.id,courseId,publishedModuleId:module.id}});
        for(const r of resources) await tx.publishedLessonResource.create({data:{...r,releaseId:release.id,publishedLessonId:lesson.id}});
      }
    }
    if(data.baseReleaseId) await tx.courseRelease.update({where:{id:data.baseReleaseId},data:{state:"SUPERSEDED",retiredAt:new Date()}});
    const activated=await tx.courseRelease.update({where:{id:release.id},data:{state:"ACTIVE"}});
    return {id:activated.id,version:activated.version,reviewedAt:activated.reviewedAt};
  });
}
export async function withdrawAcademicCourse(actorId:string,courseId:string,expectedReleaseId:string) {
  return transaction(async tx=>{
    await authorize(tx,actorId,courseId,true);
    await lockCourse(tx,courseId);
    const active=await tx.courseRelease.findFirst({where:{courseId,state:"ACTIVE"},select:{id:true}});
    if(!active || active.id!==expectedReleaseId) throw new AcademicPublicationError("STALE","Active release changed");
    await tx.courseRelease.update({where:{id:active.id},data:{state:"WITHDRAWN",retiredAt:new Date()}});
    return {withdrawn:true};
  });
}
