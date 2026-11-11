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
    /^\/resources\/public\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)$/i.test(
      decoded,
    ) && !decoded.split("/").some((part) => part === "." || part === "..")
  );
}

function renderMath(source: string, displayMode: boolean): string {
  if (source.length > MAX_MATH_LENGTH) {
    return `<code>${markdown.utils.escapeHtml(source)}</code>`;
  }
  return katex.renderToString(source, {
    displayMode,
    throwOnError: false,
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

markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index]!;
  const source = String(token.attrGet("src") ?? "");
  const alt = markdown.utils.escapeHtml(token.content);
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
