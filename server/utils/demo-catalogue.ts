import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { LearnerCourse } from "../../shared/public-content.ts";

/** Local development catalogue, not a public release or a built-server feature. */
export type DevelopmentCatalogueResult = { enabled: boolean; courses: LearnerCourse[] };

export function isLoopback(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export function developmentCatalogueAllowed(
  dev: boolean,
  host: string,
  peer: string | undefined,
  localAddress: string | undefined,
): boolean {
  return dev === true && isLoopback(peer) &&
    isLoopback(localAddress) &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}

export const developmentProofHeader = "x-skyinnk-internal-catalogue-loopback";
export const developmentProofEnv = "SKYINNK_INTERNAL_CATALOGUE_TOKEN";
const tokenPattern = /^[a-f0-9]{64}$/;

/** Runs on Nuxt's OUTER HTTP listener, before its worker proxy. Client-supplied
 * proof is always removed, including duplicate raw headers. */
export function markDevelopmentIngress(
  request: Pick<IncomingMessage, "headers" | "rawHeaders" | "socket">,
  listenerAddress: string | undefined,
  token: string,
): void {
  delete request.headers[developmentProofHeader];
  for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2)
    if (request.rawHeaders[index]?.toLowerCase() === developmentProofHeader)
      request.rawHeaders.splice(index, 2);
  if (!isLoopback(listenerAddress) || !tokenPattern.test(token) ||
      !developmentCatalogueAllowed(true, request.headers.host ?? "",
        request.socket.remoteAddress, request.socket.localAddress)) return;
  request.headers[developmentProofHeader] = token;
  request.rawHeaders.push(developmentProofHeader, token);
}

export function developmentCatalogueAuthorized(
  dev: boolean,
  host: string,
  proof: string | undefined,
  token: string | undefined,
): boolean {
  return dev === true &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host) &&
    typeof proof === "string" && tokenPattern.test(proof) &&
    typeof token === "string" && tokenPattern.test(token) &&
    timingSafeEqual(Buffer.from(proof), Buffer.from(token));
}

/** Only a proof injected by the actual loopback ingress can open the database.
 * A worker's Unix socket or proxy-provided IP/Host alone is not authority. */
export async function loadDevelopmentCatalogue(
  dev: boolean,
  host: string,
  proof: string | undefined,
  token: string | undefined,
  load: () => Promise<LearnerCourse[]>,
): Promise<DevelopmentCatalogueResult> {
  if (!developmentCatalogueAuthorized(dev, host, proof, token))
    return { enabled: false, courses: [] };
  return { enabled: true, courses: await load() };
}

const selection = {
  sourceKey: true, slug: true, title: true, summary: true, audience: true,
  subjects: {
    where: { isPrimary: true, subject: { archivedAt: null } },
    take: 1,
    select: { subject: { select: { name: true } } },
  },
  modules: {
    orderBy: { position: "asc" },
    select: {
      sourceKey: true, title: true, position: true,
      lessons: {
            orderBy: { position: "asc" },
            select: { sourceKey: true, slug: true, title: true, position: true, kind: true, overview: true, notesMarkdown: true },
      },
    },
  },
} satisfies Prisma.CourseSelect;

/** Explicit narrow projection; no user, permission, review, media keys or private file data. */
export async function readDevelopmentCatalogue(db: Pick<PrismaClient, "course">): Promise<LearnerCourse[]> {
  const rows = await db.course.findMany({
    where: { archivedAt: null },
    orderBy: { slug: "asc" },
    select: selection,
  });
  return rows.map((course) => ({
    key: course.sourceKey, slug: course.slug, title: course.title,
    summary: course.summary, audience: course.audience,
    subject: course.subjects[0]?.subject.name ?? "General",
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
