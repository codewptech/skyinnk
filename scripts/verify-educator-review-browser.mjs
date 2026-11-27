/** Actual browser verification of the unapproved local review packet only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { candidates } from "./check-draft-lesson-rendering.mjs";
import { exportCurrentDrafts } from "./export-educator-review.mjs";

export async function verifyEducatorReviewBrowser(browser) {
  const expected = candidates.map((candidate) => ({
    id: candidate.id,
    math: candidate.math,
    hash: createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "../docs/content-review/v1-class10/" + candidate.file,
            import.meta.url,
          ),
        ),
      )
      .digest("hex"),
  }));
  const page = await browser.newPage({
    viewport: { width: 1365, height: 900 },
  });
  const requests = [],
    errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  // The document is local generated HTML. Do not allow external requests,
  // even if future manuscript or exporter changes introduce them.
  await page.route("**/*", (route) => route.abort());
  try {
    await page.setContent(exportCurrentDrafts(), { waitUntil: "load" });
    const data = await page.evaluate(() => {
      const articles = [...document.querySelectorAll("main > article")];
      const inventory = [...document.querySelectorAll("main > table tbody tr")];
      const math = [...document.querySelectorAll(".notes math")];
      return {
        ids: articles.map((article) => article.id),
        entries: inventory.map((row) => ({
          id: row.querySelector("a")?.textContent,
          hash: row.querySelector(".hash")?.textContent,
          href: row.querySelector("a")?.getAttribute("href"),
        })),
        decisions: articles.map((article) => ({
          id: article.id,
          hash: article.querySelector(".source .hash")?.textContent,
          blankCells: [...article.querySelectorAll(".decision tbody td")].map(
            (cell) => cell.textContent,
          ),
          math: article.querySelectorAll(".notes math").length,
          headingMatches: article.contains(
            document.getElementById(article.getAttribute("aria-labelledby")),
          ),
        })),
        nativeMath: math.length,
        visibleMath: math.filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return (
            rect.width > 0 && rect.height > 0 && style.visibility === "visible"
          );
        }).length,
        hiddenHtml: [...document.querySelectorAll(".katex-html")].every(
          (node) => getComputedStyle(node).display === "none",
        ),
        forbidden: document.querySelectorAll(
          "script, iframe, object, embed, img, form, input, link[rel=stylesheet]",
        ).length,
      };
    });
    assert.deepEqual(
      data.ids,
      expected.map((item) => item.id),
    );
    assert.deepEqual(
      data.entries,
      expected.map((item) => ({
        id: item.id,
        hash: item.hash,
        href: "#" + item.id,
      })),
    );
    assert.equal(data.decisions.length, 7);
    for (const [index, item] of data.decisions.entries()) {
      assert.equal(item.id, expected[index].id);
      assert.equal(item.hash, expected[index].hash);
      assert.equal(item.headingMatches, true);
      assert.deepEqual(item.blankCells, Array(8).fill(""));
      if (expected[index].math)
        assert.ok(item.math > 0, item.id + " native math missing");
    }
    assert.ok(data.nativeMath > 0);
    assert.equal(
      data.visibleMath,
      data.nativeMath,
      "Every native MathML box must be visible",
    );
    assert.equal(data.hiddenHtml, true, "Redundant KaTeX HTML must not render");
    assert.equal(data.forbidden, 0);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.evaluate(() => matchMedia("print").matches), true);
    // No path: Chromium returns bytes in memory, never in public assets.
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 1000, "Nonempty print output required");
    assert.deepEqual(
      requests,
      [],
      "Offline review packet must initiate no network requests",
    );
    assert.deepEqual(errors, []);
    const result = {
      drafts: data.ids.length,
      blankDecisionCells: data.decisions.reduce(
        (sum, item) => sum + item.blankCells.length,
        0,
      ),
      nativeMath: data.nativeMath,
      visibleMath: data.visibleMath,
      printBytes: pdf.length,
      networkRequests: requests.length,
    };
    console.log(
      "PASS educator packet browser evidence " + JSON.stringify(result),
    );
    return result;
  } finally {
    await page.close();
  }
}
