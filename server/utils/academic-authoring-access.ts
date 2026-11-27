import type { Prisma } from "@prisma/client";

const permissions = ["EDITOR", "REVIEWER", "EDITOR_REVIEWER"];
export class AcademicAuthoringError extends Error {
  readonly statusCode: 400 | 403;
  constructor(statusCode: 400 | 403, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AcademicAuthoringError";
  }
}

export function parseAcademicCoursePage(query: Record<string, unknown>) {
  if (Object.keys(query).some((key) => key !== "offset" && key !== "limit")) {
    throw new AcademicAuthoringError(400, "Invalid course query");
  }
  function integer(value: unknown, fallback: number, min: number, max: number) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
      throw new AcademicAuthoringError(400, "Invalid course pagination");
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < min || number > max) {
      throw new AcademicAuthoringError(400, "Invalid course pagination");
    }
    return number;
  }
  return { offset: integer(query.offset, 0, 0, 100_000), limit: integer(query.limit, 25, 1, 100) };
}

type AuthoringDb = Pick<Prisma.TransactionClient, "user" | "courseEducator" | "course">;

/** Caller must use a verified server-session subject, never an input actor ID.
 * Run this entire read in one database transaction. No role is granted here. */
export async function listAcademicAuthoringCourses(
  tx: AuthoringDb,
  subject: string,
  query: Record<string, unknown>,
) {
  const { offset, limit } = parseAcademicCoursePage(query);
  if (typeof subject !== "string" || !subject.trim() || subject.length > 255 ||
      subject.includes("\0") || /[\uD800-\uDFFF]/u.test(subject)) {
    throw new AcademicAuthoringError(403, "Academic access required");
  }
  const actor = await tx.user.findUnique({
    where: { auth0Id: subject },
    select: { id: true, roles: { where: { role: { key: "academic-admin" } }, select: { roleId: true }, take: 1 } },
  });
  if (!actor) throw new AcademicAuthoringError(403, "Academic access required");
  const admin = actor.roles.length > 0;
  const scope = { userId: actor.id, permission: { in: permissions } };
  if (!admin && !await tx.courseEducator.findFirst({ where: scope, select: { courseId: true } })) {
    throw new AcademicAuthoringError(403, "Academic access required");
  }
  const rows = await tx.course.findMany({
    where: admin ? {} : { educators: { some: scope } },
    orderBy: { slug: "asc" },
    skip: offset,
    take: limit + 1,
    select: {
      id: true, sourceKey: true, slug: true, title: true, summary: true, audience: true,
      archivedAt: true,
      educators: { where: scope, select: { permission: true }, take: 1 },
      _count: { select: { modules: true } },
    },
  });
  return {
    canCreateCourse: admin,
    courses: rows.slice(0, limit).map((course) => {
      const permission = course.educators[0]?.permission;
      const active = course.archivedAt === null;
      return {
        id: course.id, key: course.sourceKey, slug: course.slug, title: course.title,
        summary: course.summary, audience: course.audience,
        archivedAt: course.archivedAt?.toISOString() ?? null,
        moduleCount: course._count.modules,
        canEdit: active && (admin || permission === "EDITOR" || permission === "EDITOR_REVIEWER"),
        canReview: active && (admin || permission === "REVIEWER" || permission === "EDITOR_REVIEWER"),
      };
    }),
    page: { offset, limit, nextOffset: rows.length > limit && offset + limit <= 100_000 ? offset + limit : null },
  };
}
