/**
 * Read-only first-release intake for final, HUMAN-approved text manuscripts.
 * Prints a candidate manifest; never writes files or grants approval.
 */
import { createHash } from "node:crypto";
import { constants, lstatSync, openSync, fstatSync, readSync, closeSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validatePublicCatalogue } from "../shared/public-content.ts";
import { markdownResourcePaths } from "../app/utils/render-markdown.ts";
import { checkFinalNoteSource } from "./validate-public-content.ts";

const MAX_NOTES_BYTES = 800_000;
const fail = message => { throw new Error("Reviewed text intake: " + message); };
function exactFields(value, fields, context) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== fields.length ||
      !fields.every(field => Object.hasOwn(value, field)))
    fail(context + " must contain exactly: " + fields.join(", "));
}
function array(value, context) {
  if (!Array.isArray(value) || value.length === 0) fail(context + " must be nonempty");
  return value;
}
function approval(value, context) {
  exactFields(value, ["status", "visibility", "reviewedBy", "reviewedAt"], context);
  // Require the real supplied record; do not default, infer, or generate an identity or timestamp.
  if (value.status !== "published" || value.visibility !== "public" ||
      typeof value.reviewedBy !== "string" || !value.reviewedBy.trim() ||
      typeof value.reviewedAt !== "string" || !value.reviewedAt.trim() ||
      /^(?:pending|unapproved|unknown|tbd|placeholder|test fixture only)$/i.test(value.reviewedBy.trim()))
    fail(context + " needs an explicit human-supplied final publication record");
  return { ...value };
}
function validNotesName(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/.test(value);
}

/** No filesystem mutations. Caller supplies the exact reviewed file bytes. */
export function prepareTextCatalogue(packet, readNotes) {
  exactFields(packet, ["schemaVersion", "courses"], "packet");
  if (packet.schemaVersion !== 1) fail("schemaVersion 1 required");
  let count = 0;
  const names = new Set();
  const courses = array(packet.courses, "courses").map(course => {
    exactFields(course, ["key", "slug", "title", "summary", "audience", "subject", "publication", "modules"], "course");
    return {
      key: course.key, slug: course.slug, title: course.title, summary: course.summary,
      audience: course.audience, subject: course.subject,
      publication: approval(course.publication, "course approval"),
      modules: array(course.modules, "modules").map(module => {
        exactFields(module, ["key", "title", "position", "lessons"], "module");
        return {
          key: module.key, title: module.title, position: module.position,
          lessons: array(module.lessons, "lessons").map(lesson => {
            exactFields(lesson, ["key", "slug", "title", "position", "overview", "notesFile", "notesSha256", "publication"], "lesson");
            count++;
            const publication = approval(lesson.publication, "lesson approval");
            if (!validNotesName(lesson.notesFile) || names.has(lesson.notesFile.toLowerCase()))
              fail("unique plain Markdown filename required");
            names.add(lesson.notesFile.toLowerCase());
            if (typeof lesson.notesSha256 !== "string" || !/^[a-f0-9]{64}$/.test(lesson.notesSha256))
              fail("exact lowercase reviewed notes SHA-256 required");
            const bytes = readNotes(lesson.notesFile);
            if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_NOTES_BYTES)
              fail("invalid notes size");
            if (createHash("sha256").update(bytes).digest("hex") !== lesson.notesSha256)
              fail("notes differ from reviewed bytes: " + lesson.notesFile);
            const notes = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
            if (!notes.trim()) fail("invalid or oversized notes");
            checkFinalNoteSource(notes, "Reviewed text intake: " + lesson.notesFile, true);
            if (markdownResourcePaths(notes).size)
              fail("text-only intake cannot introduce resource references");
            return {
              key: lesson.key, slug: lesson.slug, title: lesson.title,
              position: lesson.position, overview: lesson.overview,
              kind: "text", notesMarkdown: notes, publication,
            };
          }),
        };
      }),
    };
  });
  if (count < 4 || count > 6) fail("initial V1 release requires 4–6 selected text lessons");
  return validatePublicCatalogue({ schemaVersion: 1, courses });
}

function inside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep));
}
function regularFile(path, limit) {
  const info = lstatSync(path, { bigint: true });
  if (!info.isFile() || info.size < 1n || info.size > BigInt(limit))
    fail("regular bounded file required");
  // Open a descriptor rather than following the path again for the read.
  // Nonblocking open also avoids waiting on a substituted FIFO on POSIX.
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch {
    fail("file changed while opening");
  }
  try {
    const same = item => item.isFile() && item.dev === info.dev &&
      item.ino === info.ino && item.size === info.size &&
      item.mtimeNs === info.mtimeNs && item.ctimeNs === info.ctimeNs;
    if (!same(fstatSync(fd, { bigint: true }))) fail("file changed while opening");
    // Allocate only the previously checked size. An expanding file must not
    // cause an unbounded read before the size limit can be checked.
    const bytes = Buffer.alloc(Number(info.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, null);
      if (count === 0) fail("file changed while reading");
      offset += count;
    }
    const extra = Buffer.alloc(1);
    if (readSync(fd, extra, 0, 1, null) !== 0 ||
        !same(fstatSync(fd, { bigint: true })) ||
        !same(lstatSync(path, { bigint: true })))
      fail("file changed while reading");
    return bytes;
  } finally {
    closeSync(fd);
  }
}
export function prepareFromStaging(packetPath, repositoryRoot) {
  const path = resolve(packetPath);
  if (basename(path) !== "reviewed-intake.json") fail("use reviewed-intake.json");
  const staging = realpathSync(dirname(path));
  if (inside(realpathSync(repositoryRoot), staging)) fail("stage approved inputs outside the repository");
  const packetBytes = regularFile(join(staging, "reviewed-intake.json"), 256_000);
  let packetText;
  try {
    // Do not silently replace corrupt bytes in reviewer names or other metadata.
    // Preserve the previous JSON parser's handling of a leading BOM.
    packetText = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(packetBytes);
  } catch {
    fail("invalid UTF-8 in reviewed-intake.json");
  }
  const packet = JSON.parse(packetText);
  return prepareTextCatalogue(packet, name => regularFile(join(staging, name), MAX_NOTES_BYTES));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 3) fail("usage: node scripts/prepare-reviewed-text-catalogue.mjs /external/staging/reviewed-intake.json");
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const result = prepareFromStaging(process.argv[2], repoRoot);
    process.stderr.write("Candidate only. Human approval is not authenticated by this tool. Do not write directly to the live catalogue.\n");
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(String(error.message ?? error) + "\n");
    process.exitCode = 1;
  }
}
