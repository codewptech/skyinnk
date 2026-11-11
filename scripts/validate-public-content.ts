import {
  readFileSync,
  readdirSync,
  statSync,
  realpathSync,
  existsSync,
} from "node:fs";
import { resolve, join, sep } from "node:path";
import MarkdownIt from "markdown-it";
import {
  validatePublicCatalogue,
  type PublicCatalogue,
} from "../shared/public-content.ts";

/** Validate actual build inputs; no runtime draft switch or filesystem URL lookup. */
export function checkPublicContent(root = resolve(".")): PublicCatalogue {
  const catalogue = validatePublicCatalogue(
    JSON.parse(readFileSync(join(root, "content/catalogue.json"), "utf8")),
  );
  const resources = new Map<string, number>();
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
          if (statSync(path).size !== resource.sizeBytes)
            throw new Error(`Incorrect resource size: ${resource.url}`);
          resources.set(resource.url, resource.sizeBytes);
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
