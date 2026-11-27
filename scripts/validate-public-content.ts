import {
  readFileSync,
  readdirSync,
  statSync,
  realpathSync,
  existsSync,
  lstatSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, sep } from "node:path";
import { markdownResourcePaths, renderMarkdown, validateMarkdownMath } from "../app/utils/render-markdown.ts";
import {
  validatePublicCatalogue,
  type PublicCatalogue,
} from "../shared/public-content.ts";

function matchesResourceFormat(bytes: Buffer, type: string): boolean {
  switch (type) {
    case "PDF":
      return /^%PDF-[12]\.\d(?:\r|\n)/.test(bytes.subarray(0, 10).toString("latin1")) &&
        /%%EOF\s*$/.test(bytes.subarray(-1024).toString("latin1"));
    case "PNG":
      return bytes.length >= 45 &&
        bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
        bytes.readUInt32BE(8) === 13 &&
        bytes.toString("latin1", 12, 16) === "IHDR" &&
        bytes.subarray(-12).equals(Buffer.from("0000000049454e44ae426082", "hex"));
    case "JPG":
    case "JPEG":
      return bytes.length >= 6 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
        bytes[2] === 0xff && bytes.readUInt16BE(bytes.length - 2) === 0xffd9;
    case "WEBP":
      return bytes.length >= 21 &&
        bytes.toString("latin1", 0, 4) === "RIFF" &&
        bytes.readUInt32LE(4) === bytes.length - 8 &&
        bytes.toString("latin1", 8, 12) === "WEBP" &&
        ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("latin1", 12, 16)) &&
        bytes.readUInt32LE(16) > 0 && bytes.readUInt32LE(16) <= bytes.length - 20;
    case "TXT":
      if (bytes.includes(0)) return false;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/** Actual rendered headings, not raw Markdown markers in literal code.
 * Direct notes may be heading-free; first-release text intake requires H2.
 */
export function checkNoteHeadingHierarchy(
  source: string, context: string, requireHeadings = false,
): void {
  const headings = [...renderMarkdown(source).matchAll(/<h([1-6])(?:\s[^>]*)?>/g)]
    .map(match => Number(match[1]));
  if ((requireHeadings || headings.length > 0) &&
      (headings[0] !== 2 || headings.includes(1) ||
       headings.some((level, i) => i > 0 && level > headings[i - 1]! + 1))) {
    throw new Error(context + ": notes require rendered headings starting at H2, no H1 or skipped heading level");
  }
}

/** Shared technical checks for final notes, including direct catalogue edits.
 * Blank notes are allowed here for video lessons; text intake/schema require text.
 * This is not an educator approval or a semantic mathematical assessment.
 */
export function checkFinalNoteSource(source: string, context: string, requireHeadings = false): void {
  if (source.length > 200_000)
    throw new Error(context + ": Lesson notes exceed renderer limit");
  if (source.includes("\0"))
    throw new Error(context + ": NUL character in final notes");
  if (/NOT EDUCATOR APPROVED|NOT EDUCATOR REVIEWED|EDITORIAL DRAFT|NOT YET EDUCATOR APPROVED|NOT APPROVED, NOT PUBLISHED/i.test(source))
    throw new Error(context + ": draft/review warning remains in final notes");
  const math = validateMarkdownMath(source);
  if (math.errors.length)
    throw new Error(context + ": invalid parsed math in final notes: " + math.errors.join("; "));
  checkNoteHeadingHierarchy(source, context, requireHeadings);
}

/** Validate actual build inputs; no runtime draft switch or filesystem URL lookup. */
export function checkPublicContent(root = resolve(".")): PublicCatalogue {
  const bytes = readFileSync(join(root, "content/catalogue.json"));
  let source: string;
  try {
    // Reject corrupt approved text rather than silently substituting characters.
    // Preserve JSON.parse's previous leading-BOM behavior.
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("Public content: invalid UTF-8 in content/catalogue.json");
  }
  const catalogue = validatePublicCatalogue(JSON.parse(source));
  const resources = new Set<string>();
  const notes: string[] = [];
  for (const course of catalogue.courses)
    for (const module of course.modules)
      for (const lesson of module.lessons) {
        checkFinalNoteSource(lesson.notesMarkdown, course.slug + "/" + lesson.slug);
        notes.push(lesson.notesMarkdown);
        for (const resource of lesson.resources ?? []) {
          const path = join(root, "public", resource.url);
          const publicRoot = realpathSync(join(root, "public")) + sep;
          if (
            !existsSync(path) ||
            !statSync(path).isFile() ||
            !realpathSync(path).startsWith(publicRoot)
          )
            throw new Error(
              `Missing or unsafe public resource: ${resource.url}`,
            );
          if (!resource.sha256)
            throw new Error(`Missing approved resource SHA-256: ${resource.url}`);
          const bytes = readFileSync(path);
          if (bytes.length !== resource.sizeBytes)
            throw new Error(`Incorrect resource size: ${resource.url}`);
          if (!matchesResourceFormat(bytes, resource.type))
            throw new Error(`Incorrect resource format: ${resource.url}`);
          if (createHash("sha256").update(bytes).digest("hex") !== resource.sha256)
            throw new Error(`Resource differs from approved bytes: ${resource.url}`);
          resources.add(resource.url);
        }
      }
  for (const source of notes) {
    for (const path of markdownResourcePaths(source)) {
      if (!resources.has(path)) throw new Error(`Notes reference an unreviewed resource: ${path}`);
    }
  }
  const resourceRoot = join(root, "public/resources");
  const walkFiles = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walkFiles(path);
      else if (
        !entry.isFile() ||
        !resources.has(
          "/" +
            path
              .slice(join(root, "public").length + 1)
              .split(sep)
              .join("/"),
        )
      )
        throw new Error(`Unlisted file in public resources: ${path}`);
    }
  };
  if (existsSync(resourceRoot)) {
    if (!lstatSync(resourceRoot).isDirectory())
      throw new Error("Public resources must be a real directory");
    walkFiles(resourceRoot);
  }
  return catalogue;
}
