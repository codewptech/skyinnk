import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { LearnerCourse } from "../../shared/public-content.ts";

/** Demo preview is opt-in, never an approved release, and never a built-server feature. */
export type DemoCataloguePreview = { enabled: boolean; courses: LearnerCourse[] };

export function isLoopback(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export function demoPreviewEnabled(
  dev: boolean,
  flag: string | undefined,
  host: string,
  peer: string | undefined,
  localAddress: string | undefined,
): boolean {
  return dev === true && flag === "1" && isLoopback(peer) &&
    isLoopback(localAddress) &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}

export const demoProofHeader = "x-skyinnk-internal-demo-loopback";
export const demoProofEnv = "SKYINNK_INTERNAL_DEMO_TOKEN";
const tokenPattern = /^[a-f0-9]{64}$/;

/** Runs on Nuxt's OUTER HTTP listener, before its worker proxy. Client-supplied
 * proof is always removed, including duplicate raw headers. */
export function markDemoIngress(
  request: Pick<IncomingMessage, "headers" | "rawHeaders" | "socket">,
  listenerAddress: string | undefined,
  flag: string | undefined,
  token: string,
): void {
  delete request.headers[demoProofHeader];
  for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2)
    if (request.rawHeaders[index]?.toLowerCase() === demoProofHeader)
      request.rawHeaders.splice(index, 2);
  if (!isLoopback(listenerAddress) || !tokenPattern.test(token) ||
      !demoPreviewEnabled(true, flag, request.headers.host ?? "",
        request.socket.remoteAddress, request.socket.localAddress)) return;
  request.headers[demoProofHeader] = token;
  request.rawHeaders.push(demoProofHeader, token);
}

export function demoPreviewAuthorized(
  dev: boolean,
  flag: string | undefined,
  host: string,
  proof: string | undefined,
  token: string | undefined,
): boolean {
  return dev === true && flag === "1" &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host) &&
    typeof proof === "string" && tokenPattern.test(proof) &&
    typeof token === "string" && tokenPattern.test(token) &&
    timingSafeEqual(Buffer.from(proof), Buffer.from(token));
}

/** Only a proof injected by the actual loopback ingress can open the database.
 * A worker's Unix socket or proxy-provided IP/Host alone is not authority. */
export async function loadDemoPreview(
  dev: boolean,
  flag: string | undefined,
  host: string,
  proof: string | undefined,
  token: string | undefined,
  load: () => Promise<LearnerCourse[]>,
): Promise<DemoCataloguePreview> {
  if (!demoPreviewAuthorized(dev, flag, host, proof, token))
    return { enabled: false, courses: [] };
  return { enabled: true, courses: await load() };
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
