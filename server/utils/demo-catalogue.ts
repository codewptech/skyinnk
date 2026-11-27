import type { Prisma, PrismaClient } from "@prisma/client";
import type { LearnerCourse } from "../../shared/public-content.ts";

/** Demo preview is opt-in, never an approved release, and never a built-server feature. */
export function demoPreviewEnabled(dev: boolean, flag: string | undefined, host: string): boolean {
  return dev === true && flag === "1" && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}

const selection = {
  sourceKey: true, slug: true, title: true, summary: true, audience: true,
  subjects: {
    where: { isPrimary: true, subject: { key: { startsWith: "demo-" }, archivedAt: null } },
    take: 1,
    select: { subject: { select: { name: true } } },
  },
  modules: {
    where: { sourceKey: { startsWith: "demo-" } },
    orderBy: { position: "asc" },
    take: 100,
    select: {
      sourceKey: true, title: true, position: true,
      lessons: {
        where: { sourceKey: { startsWith: "demo-" } },
        orderBy: { position: "asc" },
        take: 100,
        select: { sourceKey: true, slug: true, title: true, position: true, kind: true, overview: true, notesMarkdown: true },
      },
    },
  },
} satisfies Prisma.CourseSelect;

/** Explicit narrow projection; no user, permission, review, media keys or private file data. */
export async function readDemoCatalogue(db: Pick<PrismaClient, "course">): Promise<LearnerCourse[]> {
  const rows = await db.course.findMany({
    where: { sourceKey: { startsWith: "demo-" }, slug: { startsWith: "demo-" }, title: { startsWith: "[DEMO] " }, archivedAt: null },
    orderBy: { slug: "asc" },
    take: 20,
    select: selection,
  });
  return rows.map((course) => ({
    key: course.sourceKey, slug: course.slug, title: course.title,
    summary: course.summary, audience: course.audience,
    subject: course.subjects[0]?.subject.name ?? "Demo subject",
    modules: course.modules.map((module) => ({
      key: module.sourceKey, title: module.title, position: module.position,
      lessons: module.lessons.map((lesson) => ({
        key: lesson.sourceKey, slug: lesson.slug, title: lesson.title,
        position: lesson.position, kind: lesson.kind === "VIDEO" ? "video" : "text",
        overview: lesson.overview, notesMarkdown: lesson.notesMarkdown,
      })),
    })),
  }));
}
