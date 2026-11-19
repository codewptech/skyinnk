import {
  readFileSync,
  readdirSync,
  statSync,
  realpathSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, sep } from "node:path";
import MarkdownIt from "markdown-it";
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
      return bytes.length >= 33 &&
        bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
        bytes.readUInt32BE(8) === 13 &&
        bytes.toString("ascii", 12, 16) === "IHDR";
    case "JPG":
    case "JPEG":
      return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "WEBP":
      return bytes.length >= 20 &&
        bytes.toString("latin1", 0, 4) === "RIFF" &&
        bytes.readUInt32LE(4) === bytes.length - 8 &&
        bytes.toString("latin1", 8, 12) === "WEBP" &&
        ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("latin1", 12, 16));
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

/** Validate actual build inputs; no runtime draft switch or filesystem URL lookup. */
export function checkPublicContent(root = resolve(".")): PublicCatalogue {
  const catalogue = validatePublicCatalogue(
    JSON.parse(readFileSync(join(root, "content/catalogue.json"), "utf8")),
  );
  const resources = new Set<string>();
  const notes: string[] = [];
  for (const course of catalogue.courses)
    for (const module of course.modules)
      for (const lesson of module.lessons) {
        if (lesson.notesMarkdown.length > 200_000)
          throw new Error("Lesson notes exceed renderer limit");
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
  const parser = new MarkdownIt({ html: false });
  for (const source of notes) {
    const walk = (tokens: ReturnType<typeof parser.parse>) => {
      for (const token of tokens) {
        const url = token.attrGet(token.type === "image" ? "src" : "href");
        if (
          typeof url === "string" &&
          url.startsWith("/resources/public/") &&
          !resources.has(url)
        )
          throw new Error(`Notes reference an unreviewed resource: ${url}`);
        if (token.children) walk(token.children);
      }
    };
    walk(parser.parse(source, {}));
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
  if (existsSync(resourceRoot)) walkFiles(resourceRoot);
  return catalogue;
}
