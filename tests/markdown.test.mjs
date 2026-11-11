import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSafeMarkdownImage,
  isSafeMarkdownLink,
  renderMarkdown,
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
