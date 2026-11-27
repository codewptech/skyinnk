/** Generate a local printable review packet, never a published lesson. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  candidates,
  checkDraftRendering,
} from "./check-draft-lesson-rendering.mjs";
import { renderMarkdown } from "../app/utils/render-markdown.ts";

const titles = Object.freeze({
  "M-01": "Pair of linear equations",
  "M-02": "Quadratic factorisation",
  "M-03": "Graphical solutions",
  "M-04": "Quadratic formula and discriminant",
  "E-01": "Formal email (supplementary)",
  "E-02": "Reading comprehension (short practice)",
  "E-03": "Formal letter",
});
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fields = [
  "Actual class / board / year / scope",
  "Worked examples and practice answers independently checked",
  "Notation, reading level, accessibility and age suitability",
  "Originality and rights evidence",
  "Required corrections and final approved revision",
  "Reviewer name, role and authority",
  "Explicit decision (approve / revise / reject)",
  "Decision date, time and timezone",
];

export function buildEducatorReview(readSource) {
  const sections = candidates.map((candidate) => {
    const bytes = readSource(candidate.file);
    if (!Buffer.isBuffer(bytes))
      throw Error("Expected exact source bytes for " + candidate.id);
    const source = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
    const report = checkDraftRendering(candidate, source);
    if (report.issues.length)
      throw Error(candidate.id + ": " + report.issues.join("; "));
    const rendered = renderMarkdown(source);
    // Preserve native MathML, tables and safe HTML; this local review layout
    // uses the browser's native MathML rather than shipping web font assets.
    return {
      candidate,
      title: titles[candidate.id],
      hash: digest(bytes),
      rendered,
      report,
    };
  });
  const rows = sections
    .map(
      ({ candidate, title, hash }) =>
        '<tr><td><a href="#' +
        escape(candidate.id) +
        '">' +
        escape(candidate.id) +
        "</a></td><td>" +
        escape(title) +
        '</td><td class="hash">' +
        hash +
        "</td></tr>",
    )
    .join("\n");
  const articles = sections
    .map(
      ({ candidate, title, hash, rendered, report }) =>
        '<article id="' +
        escape(candidate.id) +
        '" aria-labelledby="title-' +
        escape(candidate.id) +
        '">' +
        '<p class="warning">EDITORIAL DRAFT — NOT EDUCATOR APPROVED — NOT PUBLISHED</p>' +
        '<h2 id="title-' +
        escape(candidate.id) +
        '">' +
        escape(candidate.id + " — " + title) +
        "</h2>" +
        '<p class="source">Source: ' +
        escape(candidate.file) +
        '<br>Exact draft SHA-256: <span class="hash">' +
        hash +
        "</span></p>" +
        '<p class="source">Technical rendering check: ' +
        report.headings +
        " headings; " +
        report.parsedMath +
        " parsed math expressions; " +
        report.tables +
        " tables. Not an educational approval.</p>" +
        '<div class="notes">' +
        rendered +
        "</div>" +
        '<section class="decision" aria-label="Blank review record for ' +
        escape(candidate.id) +
        '">' +
        "<h3>Independent reviewer decision — leave blank until completed by the reviewer</h3>" +
        "<p>The hash above identifies this draft only. If edited, review and record the new final file and its exact hash.</p>" +
        '<table><thead><tr><th scope="col">Review field</th><th scope="col">Reviewer entry</th></tr></thead><tbody>' +
        fields
          .map(
            (field) =>
              '<tr><th scope="row">' + escape(field) + "</th><td></td></tr>",
          )
          .join("") +
        '</tbody></table><p class="warning">No approval or rights decision has been supplied.</p></section></article>',
    )
    .join("\n");
  return (
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">' +
    "<title>Skyinnk — educator review only</title><style>" +
    "body{font:16px/1.65 system-ui,sans-serif;color:#172333;background:#fff;margin:0}main{max-width:850px;margin:auto;padding:24px}h1,h2,h3{line-height:1.3}article{margin:48px 0;border-top:2px solid #394b61;padding-top:24px}.warning{font-weight:700;color:#8a231f;border-left:4px solid #8a231f;padding:8px 12px;background:#fff5f3}.source{font-size:.9rem;color:#394b61}.hash{font-family:monospace;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #aeb9c5;padding:7px 10px;text-align:left;vertical-align:top}th{background:#edf2f7}blockquote{border-left:3px solid #8998a9;margin-inline:0;padding-inline:12px}.notes-table-scroll{max-width:100%;overflow-x:auto}.katex-html{display:none!important}.katex-mathml{position:static!important;clip:auto!important;width:auto!important;height:auto!important;overflow:visible!important}.katex-display{display:block;overflow-x:auto;text-align:center;margin:14px 0}.notes{overflow-wrap:anywhere}.decision{border-top:1px solid #aeb9c5;margin-top:24px}.decision td{width:55%;height:36px}a{color:#164b96}pre{white-space:pre-wrap}code{overflow-wrap:anywhere}@media print{main{max-width:none;padding:0}article{break-before:page;margin:0;border:0;padding:0}.decision{break-before:page}tr{break-inside:avoid}h2,h3{break-after:avoid}.warning{background:white}.notes-table-scroll,.katex-display{overflow:visible}}" +
    "</style></head><body><main><h1>Skyinnk — Class 10 educator review packet</h1>" +
    '<p class="warning">Seven original candidate manuscripts. NOT EDUCATOR APPROVED OR PUBLISHED.</p>' +
    "<p>Select only 4–6 genuinely approved lessons for the initial V1 release. Verify every answer, the actual curriculum and the rights to reuse the final revision. This local print layout uses native MathML; verify the actual learner interface separately. No automatic network resources, scripts or approval submission are included. External reference links, if followed deliberately, leave this local document.</p>" +
    '<h2>Draft inventory and exact source hashes</h2><table><thead><tr><th scope="col">ID</th><th scope="col">Candidate</th><th scope="col">SHA-256</th></tr></thead><tbody>' +
    rows +
    "</tbody></table>" +
    articles +
    "</main></body></html>\n"
  );
}
export function exportCurrentDrafts(
  root = fileURLToPath(
    new URL("../docs/content-review/v1-class10/", import.meta.url),
  ),
) {
  return buildEducatorReview((file) => readFileSync(resolve(root, file)));
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    if (process.argv.length !== 2)
      throw Error("Usage: node scripts/export-educator-review.mjs");
    process.stdout.write(exportCurrentDrafts());
  } catch (error) {
    process.stderr.write(String(error.message ?? error) + "\n");
    process.exitCode = 1;
  }
}
