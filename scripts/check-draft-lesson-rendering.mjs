/**
 * Technical preflight only, for the seven currently staged editorial drafts.
 * Uses the actual learner Markdown/KaTeX renderer without publishing anything.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { renderMarkdown, markdownResourcePaths } from "../app/utils/render-markdown.ts";

export const candidates = Object.freeze([
  { id: "M-01", file: "math-01-pair-of-linear-equations.md", math: true },
  { id: "M-02", file: "math-02-quadratic-factorisation.md", math: true },
  { id: "M-03", file: "math-03-graphical-solutions.md", math: true },
  { id: "M-04", file: "math-04-quadratic-formula.md", math: true },
  { id: "E-01", file: "english-01-formal-email.md", math: false },
  { id: "E-02", file: "english-02-reading-comprehension.md", math: false },
  { id: "E-03", file: "english-03-formal-letter.md", math: false },
].map(Object.freeze));
const count = (html, pattern) => [...html.matchAll(pattern)].length;

export function checkDraftRendering(candidate, source) {
  const issues = [];
  if (typeof source !== "string" || !source.trim() || source.length > 200_000)
    return { id: candidate.id, issues: ["Missing or oversized manuscript"] };
  if (!/NOT EDUCATOR APPROVED/i.test(source))
    issues.push("Explicit unapproved editorial notice missing");
  const html = renderMarkdown(source);
  const headings = [...html.matchAll(/<h([1-6])(?:\s[^>]*)?>/g)].map(m => Number(m[1]));
  if (headings[0] !== 2 || headings.includes(1)) issues.push("Notes must start at H2 and contain no H1");
  if (headings.some((level, i) => i > 0 && level > headings[i - 1] + 1))
    issues.push("Skipped heading level");
  if (!/<h2>Learning outcomes<\/h2>/i.test(html) || !/<h2>Before moving on<\/h2>/i.test(html))
    issues.push("Learning outcomes or final review section missing");
  if (/<(?:script|iframe|object|embed)\b/i.test(html)) issues.push("Active element rendered");
  if (/\bclass="[^"]*\bkatex-error\b/i.test(html)) issues.push("KaTeX reported an expression error");
  const math = count(html, /<math\b/g);
  if (candidate.math && !math) issues.push("Mathematics manuscript has no rendered MathML");
  const tables = count(html, /<table>/g);
  const regions = count(html, /class="notes-table-scroll"/g);
  const headers = count(html, /<th(?:\s[^>]*)?>/g);
  const scoped = count(html, /<th\b[^>]*\bscope="col"/g);
  if (tables !== regions || headers !== scoped) issues.push("Native table wrapper or column scope missing");
  if (markdownResourcePaths(source).size || /<img\b/i.test(html))
    issues.push("Draft requires separate media/resource verification");
  return { id: candidate.id, headings: headings.length, math, tables, headers, issues };
}

export function checkAllDrafts(root = fileURLToPath(new URL("../docs/content-review/v1-class10/", import.meta.url))) {
  return candidates.map(candidate => {
    const bytes = readFileSync(resolve(root, candidate.file));
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return checkDraftRendering(candidate, source);
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 2) throw new Error("Usage: node scripts/check-draft-lesson-rendering.mjs");
    const result = checkAllDrafts();
    for (const row of result) console.log(JSON.stringify(row));
    console.log("Technical render preflight only; no educational approval or publication.");
    if (result.some(row => row.issues.length)) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
