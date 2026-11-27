import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSafeMarkdownImage,
  isSafeMarkdownLink,
  markdownResourcePaths,
  renderMarkdown,
  validateMarkdownMath,
} from "../app/utils/render-markdown.ts";

test("notes render readable Markdown, Unicode, tables and escaped code", () => {
  const result = renderMarkdown(
    "## Understanding अनुपात\n\n**Compare** these values.\n\n| A | B |\n|---|---|\n| 2 | 4 |\n\n```html\n<script>alert(1)</script>\n```",
  );
  assert.match(result, /<h2>Understanding अनुपात<\/h2>/);
  assert.match(result, /<strong>Compare<\/strong>/);
  assert.match(result, /<table>/);
  assert.match(result, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(result, /<script>/);
});

test("raw HTML and hostile links cannot execute or load embedded content", () => {
  const result = renderMarkdown(
    '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<iframe src="https://attacker.invalid"></iframe>\n\n[bad](javascript:alert%281%29) [entity](jav&#x61;script:alert%281%29) [data](data:text/html,test)',
  );
  assert.doesNotMatch(result, /<(?:script|img|iframe)\b/);
  assert.doesNotMatch(result, /href="(?:javascript|data):/);
  assert.match(result, /&lt;script&gt;/);
  for (const link of [
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//attacker.invalid",
    "/\\attacker.invalid",
    "/%5cattacker.invalid",
    "https://user:secret@example.com",
    "%E0%A4%A",
    "https://example.com/%0aevil",
  ]) {
    assert.equal(isSafeMarkdownLink(link), false, link);
  }
  for (const link of [
    "https://example.com/notes",
    "/courses/class10-math",
    "#revision",
  ]) {
    assert.equal(isSafeMarkdownLink(link), true, link);
  }
  assert.match(
    renderMarkdown("[Reference](https://example.com/notes)"),
    /rel="noopener noreferrer"/,
  );
});

test("images are restricted to local public raster resources", () => {
  for (const source of [
    "https://tracker.invalid/pixel.png",
    "data:image/png;base64,AAAA",
    "/resources/public/../private.png",
    "/resources/public/%2e%2e/private.png",
    "/resources/public/diagram.svg",
  ]) {
    assert.equal(isSafeMarkdownImage(source), false, source);
    assert.doesNotMatch(renderMarkdown(`![Description](${source})`), /<img\b/);
  }
  const result = renderMarkdown(
    '![A triangle](/resources/public/triangle.png "Diagram")',
  );
  assert.match(
    result,
    /<img src="\/resources\/public\/triangle.png" alt="A triangle" title="Diagram" loading="lazy" decoding="async">/,
  );
});

test("math renders accessible inline and block output without treating code as math", () => {
  const result = renderMarkdown(
    "The equation is $x^2 + y^2 = 1$.\n\n$$\n\\frac{1}{2}\n$$\n\n`$notMath$`\n\n```\n$$notMath$$\n```",
  );
  assert.match(result, /class="katex"/);
  assert.match(result, /class="katex-display"/);
  assert.match(result, /<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
  assert.match(result, /<code>\$notMath\$<\/code>/);
  assert.match(result, /<pre><code>\$\$notMath\$\$/);
  assert.equal(
    renderMarkdown("An escaped \\$5 price."),
    "<p>An escaped $5 price.</p>\n",
  );
});

test("untrusted TeX cannot create links/images or leak macros between expressions", () => {
  const result = renderMarkdown(
    "$\\href{javascript:alert(1)}{click}$\n\n$\\includegraphics{https://attacker.invalid/pixel.png}$\n\n$\\htmlClass{attacker}{x}$",
  );
  assert.doesNotMatch(result, /<(?:a|img)\b|class="attacker"/);
  assert.doesNotThrow(() => renderMarkdown("$\\def\\x{\\x}\\x$"));
  assert.doesNotThrow(() => renderMarkdown("$\\badcommand{x}$"));
  renderMarkdown("$\\gdef\\skyinnkSecret{secret-macro}$");
  assert.doesNotMatch(renderMarkdown("$\\skyinnkSecret$"), /secret-macro/);
  assert.match(renderMarkdown("x".repeat(200_001)), /too long to display/);
});

test("reviewed image alt text reads inline emphasis and code without Markdown punctuation", () => {
  const html = renderMarkdown(
    '![**Triangle** and `x < y` & **angle**](/resources/public/triangle.png "Diagram")',
  );
  assert.match(html, /<img src="\/resources\/public\/triangle\.png"/);
  assert.match(html, /alt="Triangle and x &lt; y &amp; angle"/);
  assert.doesNotMatch(html, /\*\*Triangle\*\*/);
  assert.match(html, /title="Diagram" loading="lazy" decoding="async"/);
});

test("unavailable images display escaped readable alt without fetching disallowed types", () => {
  for (const path of [
    "/resources/public/example.gif",
    "/resources/public/example.avif",
    "/resources/public/example.svg",
    "https://tracker.invalid/pixel.png",
  ]) {
    assert.equal(isSafeMarkdownImage(path), false);
    const html = renderMarkdown("![**Area** and `x < y`](" + path + ")");
    assert.doesNotMatch(html, /<img\b/);
    assert.match(
      html,
      /<span class="image-unavailable">Area and x &lt; y<\/span>/,
    );
  }
  for (const path of [
    "/resources/public/picture.png",
    "/resources/public/picture.jpg",
    "/resources/public/picture.jpeg",
    "/resources/public/picture.webp",
  ]) {
    assert.equal(isSafeMarkdownImage(path), true);
    assert.match(renderMarkdown("![Image](" + path + ")"), /<img\b/);
  }
});

test("image descriptions escape quotes and cannot inject attributes", () => {
  const rendered = renderMarkdown(
    '![A "diagram" & <script>bad</script>](/resources/public/picture.webp)',
  );
  assert.match(rendered, /alt="A &quot;diagram&quot; &amp; /);
  assert.doesNotMatch(rendered, /<script>|onerror=|onload=/);
  assert.match(rendered, /loading="lazy" decoding="async"/);
});

test("tables retain native structure inside uniquely named keyboard scroll regions", () => {
  const source =
    "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n| C | D |\n| --- | --- |\n| 3 | 4 |";
  const result = renderMarkdown(source);
  assert.match(
    result,
    /<div class="notes-table-scroll" role="region" aria-label="Lesson notes table 1" tabindex="-1"><table>/,
  );
  assert.match(
    result,
    /<div class="notes-table-scroll" role="region" aria-label="Lesson notes table 2" tabindex="-1"><table>/,
  );
  assert.equal([...result.matchAll(/<\/table>\s*<\/div>/g)].length, 2);
  assert.equal([...result.matchAll(/<thead>/g)].length, 2);
  assert.equal([...result.matchAll(/<th scope="col">/g)].length, 4);
  assert.equal([...result.matchAll(/<tbody>/g)].length, 2);
  assert.doesNotMatch(
    renderMarkdown('<div class="notes-table-scroll" tabindex="0">fake</div>'),
    /<div class="notes-table-scroll"/,
  );
});

test("explicit HTTPS link policy rejects ambiguous URL forms interpreted differently with a browser base", () => {
  const base = "https://www.skyinnk.in/courses/fixture/lessons/example";
  const ambiguous = "https:/resources/public/missing.txt";
  assert.equal(
    new URL(ambiguous, base).href,
    "https://www.skyinnk.in/resources/public/missing.txt",
  );
  for (const value of [
    ambiguous,
    "https:resources/public/missing.txt",
    "https:///example.invalid/path",
    "https%3A%2F%2Fexample.invalid",
    "%23section",
    "%2Fresources/public/missing.txt",
  ]) {
    assert.equal(isSafeMarkdownLink(value), false, value);
    assert.doesNotMatch(renderMarkdown("[Read](" + value + ")"), /<a\b/, value);
  }
  for (const value of [
    "https://example.invalid/path",
    "HTTPS://example.invalid/path",
    "/resources/public/%66ile.txt",
    "#section",
  ]) {
    assert.equal(isSafeMarkdownLink(value), true, value);
    assert.match(renderMarkdown("[Read](" + value + ")"), /<a\b/, value);
  }
});

test("notes reject invalid encoded HTTPS hosts without throwing in resource preflight", () => {
  for (const host of ["example.invalid%3Ftext", "example.invalid%23text"]) {
    const target = "https://" + host;
    const source = "[Read](" + target + ")";
    assert.equal(isSafeMarkdownLink(target), false);
    assert.doesNotMatch(renderMarkdown(source), /<a\b/);
    assert.deepEqual([...markdownResourcePaths(source)], []);
  }
  const source = [
    "[Local](/resources/public/%66ile.txt?version=1#top)",
    "[Same site](https://www.skyinnk.in:443/resources/public/other.txt)",
    "[External](https://example.invalid/resources/public/third.txt)",
  ].join(" ");
  assert.deepEqual(
    [...markdownResourcePaths(source)],
    ["/resources/public/file.txt", "/resources/public/other.txt"],
  );
});

test("image descriptions do not create links, image requests or rendered math", () => {
  const source = [
    "![A [linked label](/resources/public/label.txt) and ![nested label](/resources/public/nested.png)](/resources/public/actual.png)",
    "![Another ![nested label](/resources/public/unloaded.png)](https://example.invalid/image.png)",
    "[Outside the description](/resources/public/document.txt)",
    "![Equation $$x^2$$](/resources/public/actual.png)",
    "![Verbatim $\\notAKaTeXCommand$](/resources/public/actual.png)",
    "![](/resources/public/decoration.png)",
  ].join("\n\n");
  assert.deepEqual(
    [...markdownResourcePaths(source)],
    [
      "/resources/public/actual.png",
      "/resources/public/document.txt",
      "/resources/public/decoration.png",
    ],
  );
  const html = renderMarkdown(source);
  assert.match(html, /alt="A linked label and nested label"/);
  assert.match(html, /alt="Equation x\^2"/);
  assert.match(html, /decoration\.png" alt=""/);
  assert.doesNotMatch(html, /<math\b/);
  assert.deepEqual(validateMarkdownMath(source), { count: 0, errors: [] });
});

test("notes number many tables in render order without scanning prior table tokens", () => {
  const source = "| A |\n| --- |\n| 1 |\n\n".repeat(300);
  const slice = Array.prototype.slice;
  let copiedPrefixTokens = 0;
  Array.prototype.slice = function (start, end) {
    if (start === 0 && Number.isInteger(end) && this[0]?.type === "table_open")
      copiedPrefixTokens += end;
    return slice.apply(this, arguments);
  };
  let result;
  try {
    result = renderMarkdown(source);
  } finally {
    Array.prototype.slice = slice;
  }
  assert.equal(copiedPrefixTokens, 0);
  assert.deepEqual(
    [...result.matchAll(/aria-label="Lesson notes table (\d+)"/g)].map(
      (match) => Number(match[1]),
    ),
    Array.from({ length: 300 }, (_, index) => index + 1),
  );
  assert.match(
    renderMarkdown("| A |\n| --- |"),
    /aria-label="Lesson notes table 1"/,
  );
});
