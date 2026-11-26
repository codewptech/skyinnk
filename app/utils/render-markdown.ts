import MarkdownIt from "markdown-it";
import katex from "katex";

const MAX_SOURCE_LENGTH = 200_000;
const MAX_MATH_LENGTH = 4_000;

/** Links are explicit HTTPS URLs, same-origin absolute paths, or local anchors. */
export function isSafeMarkdownLink(value: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (/[\u0000-\u0020\u007f\\]/.test(decoded)) return false;
  if (decoded.startsWith("#")) return true;
  if (decoded.startsWith("/") && !decoded.startsWith("//")) return true;
  try {
    const url = new URL(decoded);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/** Notes never load remote trackers or active SVG/data images. */
export function isSafeMarkdownImage(value: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  return (
    /^\/resources\/public\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(
      decoded,
    ) && !decoded.split("/").some((part) => part === "." || part === "..")
  );
}

function renderMath(source: string, displayMode: boolean, throwOnError = false): string {
  if (source.length > MAX_MATH_LENGTH) {
    if (throwOnError) throw new Error("Math expression exceeds renderer length limit");
    return `<code>${markdown.utils.escapeHtml(source)}</code>`;
  }
  return katex.renderToString(source, {
    displayMode,
    throwOnError,
    trust: false,
    strict: "ignore",
    maxExpand: 1_000,
    maxSize: 20,
    output: "htmlAndMathml",
    // A new macro scope for every expression prevents cross-lesson mutation.
    macros: {},
  });
}

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  maxNesting: 30,
});
markdown.validateLink = isSafeMarkdownLink;

// Keep the actual table element and its native accessibility semantics.
// Only our renderer creates these attributes; source HTML remains disabled.
const renderTableOpen =
  markdown.renderer.rules.table_open ??
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));
const renderTableClose =
  markdown.renderer.rules.table_close ??
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));
markdown.renderer.rules.table_open = (tokens, index, options, environment, renderer) => {
  const number = tokens.slice(0, index + 1).filter(token => token.type === "table_open").length;
  return `<div class="notes-table-scroll" role="region" aria-label="Lesson notes table ${number}" tabindex="-1">` +
    renderTableOpen(tokens, index, options, environment, renderer);
};
markdown.renderer.rules.table_close = (tokens, index, options, environment, renderer) =>
  renderTableClose(tokens, index, options, environment, renderer) + "</div>\n";

// Markdown pipe-table headers always describe columns. Make that relationship
// explicit rather than relying on browser inference for short numeric tables.
const renderHeaderOpen =
  markdown.renderer.rules.th_open ??
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));
markdown.renderer.rules.th_open = (tokens, index, options, environment, renderer) => {
  tokens[index]!.attrSet("scope", "col");
  return renderHeaderOpen(tokens, index, options, environment, renderer);
};


const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (
  tokens,
  index,
  options,
  environment,
  renderer,
) => {
  tokens[index]!.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

type InlineToken = NonNullable<ReturnType<typeof markdown.parse>[number]["children"]>[number];

/** Strip inline syntax from image descriptions, including formatted and code text. */
function plainImageLabel(tokens: readonly InlineToken[]): string {
  let result = "";
  for (const token of tokens) {
    if (token.type === "text" || token.type === "code_inline" || token.type === "math_inline") {
      result += token.content;
    } else if (token.type === "softbreak" || token.type === "hardbreak") {
      result += " ";
    } else if (token.children?.length) {
      result += plainImageLabel(token.children);
    }
  }
  return result;
}

markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index]!;
  const source = String(token.attrGet("src") ?? "");
  // Only text/code and line-break meaning should reach an accessible name.
  // Escape it once for the HTML attribute; reject raw HTML and remote images.
  const alt = markdown.utils.escapeHtml(plainImageLabel(token.children ?? []));
  if (!isSafeMarkdownImage(source))
    return `<span class="image-unavailable">${alt}</span>`;
  const title = String(token.attrGet("title") ?? "");
  return `<img src="${markdown.utils.escapeHtml(source)}" alt="${alt}"${title ? ` title="${markdown.utils.escapeHtml(title)}"` : ""} loading="lazy" decoding="async">`;
};

markdown.inline.ruler.before("escape", "skyinnk_math", (state, silent) => {
  const start = state.pos;
  if (state.src[start] !== "$") return false;
  const display = state.src.startsWith("$$", start);
  const marker = display ? "$$" : "$";
  const contentStart = start + marker.length;
  if (/\s/.test(state.src[contentStart] ?? " ") && !display) return false;
  let end = contentStart;
  while ((end = state.src.indexOf(marker, end)) !== -1) {
    let precedingSlashes = 0;
    for (
      let index = end - 1;
      index >= contentStart && state.src[index] === "\\";
      index--
    )
      precedingSlashes++;
    if (precedingSlashes % 2 === 0) break;
    end += marker.length;
  }
  if (
    end === -1 ||
    end === contentStart ||
    (!display && /\s/.test(state.src[end - 1]!))
  )
    return false;
  if (!silent) {
    const token = state.push(
      display ? "math_display" : "math_inline",
      "math",
      0,
    );
    token.content = state.src.slice(contentStart, end).trim();
  }
  state.pos = end + marker.length;
  return true;
});

markdown.block.ruler.before(
  "fence",
  "skyinnk_math_block",
  (state, startLine, endLine, silent) => {
    const openingStart = state.bMarks[startLine]! + state.tShift[startLine]!;
    const opening = state.src
      .slice(openingStart, state.eMarks[startLine])
      .trim();
    if (!opening.startsWith("$$")) return false;
    const sameLine = opening.length > 4 && opening.endsWith("$$");
    let closingLine = startLine;
    if (!sameLine && opening !== "$$") return false;
    if (!sameLine) {
      for (closingLine = startLine + 1; closingLine < endLine; closingLine++) {
        const line = state.src
          .slice(
            state.bMarks[closingLine]! + state.tShift[closingLine]!,
            state.eMarks[closingLine],
          )
          .trim();
        if (line === "$$") break;
      }
      if (closingLine === endLine) return false;
    }
    if (silent) return true;
    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = sameLine
      ? opening.slice(2, -2).trim()
      : state
          .getLines(startLine + 1, closingLine, state.blkIndent, false)
          .trim();
    token.map = [startLine, closingLine + 1];
    state.line = closingLine + 1;
    return true;
  },
);

markdown.renderer.rules.math_inline = (tokens, index) =>
  renderMath(tokens[index]!.content, false);
markdown.renderer.rules.math_display = (tokens, index) =>
  renderMath(tokens[index]!.content, true);
markdown.renderer.rules.math_block = (tokens, index) =>
  `${renderMath(tokens[index]!.content, true)}\n`;

/** Safe shared SSR/client renderer. Only this output is passed to v-html. */
export function renderMarkdown(source: string): string {
  if (source.length > MAX_SOURCE_LENGTH) {
    return "<p>These notes are too long to display. Please contact the course author.</p>";
  }
  return markdown.render(source);
}

/** Resolve the local resource requests that the rendered notes can produce. */
export function markdownResourcePaths(source: string): Set<string> {
  const paths = new Set<string>();
  // Use the canonical public origin so absolute same-site links are subject to
  // the same reviewed-resource allowlist as relative links.
  const base = "https://www.skyinnk.in";
  const walk = (tokens: ReturnType<typeof markdown.parse>) => {
    for (const token of tokens) {
      const image = token.type === "image";
      const value = token.attrGet(image ? "src" : "href");
      if (typeof value === "string" &&
          (value.startsWith("/") || /^https:\/\//i.test(value)) &&
          (image ? isSafeMarkdownImage(value) : isSafeMarkdownLink(value))) {
        const url = new URL(value, base);
        const path = decodeURIComponent(url.pathname);
        if (url.origin === base && path.startsWith("/resources/public/")) paths.add(path);
      }
      if (token.children) walk(token.children);
    }
  };
  walk(markdown.parse(source, {}));
  return paths;
}

/** Editorial preflight: validate the same parsed math tokens with strict error
 * reporting, without changing the learner renderer's graceful fallback. */
export function validateMarkdownMath(source: string): { count: number; errors: string[] } {
  if (source.length > MAX_SOURCE_LENGTH)
    return { count: 0, errors: ["Notes exceed renderer length limit"] };
  let count = 0;
  const errors: string[] = [];
  const walk = (tokens: ReturnType<typeof markdown.parse>) => {
    for (const token of tokens) {
      if (["math_inline", "math_display", "math_block"].includes(token.type)) {
        count++;
        try {
          renderMath(token.content, token.type !== "math_inline", true);
        } catch {
          errors.push(`KaTeX expression ${count} rejected or exceeds renderer limits`);
        }
      }
      if (token.children) walk(token.children);
    }
  };
  walk(markdown.parse(source, {}));
  return { count, errors };
}
