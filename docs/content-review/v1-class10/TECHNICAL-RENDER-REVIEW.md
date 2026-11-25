# Technical manuscript rendering review

**Not educator approval, not publication.** This technical check is separate from the human approval packets under #108 and #127. It does not modify those manuscripts, the catalogue or public resources.

Run in the repository with Node 24 and the locked dependencies installed:

```bash
node scripts/check-draft-lesson-rendering.mjs
```

The report covers M-01 to M-04 and E-01 to E-03 using the same Markdown/KaTeX renderer used in learner pages. It reports section headings, rendered MathML expressions, native tables and column headers; fails on detected structural errors, KaTeX error markup, missing required math, known active rendered elements or resource references requiring separate review. The regression suite runs this against the actual seven editorial files as well as deliberately invalid synthetic inputs. It checks the draft approval warning remains visible; it never removes it.

A passing technical preflight does **not** establish educational correctness, board alignment, quality of explanations, complete coverage, rights, complete TeX parsing (for example an unmatched delimiter may become ordinary text), or real screen-reader/device behavior. Educators should check the rendered content, including every equation, table, answer and the graphing exercise. After approval, stage exact final bytes outside the repository and follow [V1 content intake](../../releases/V1-CONTENT-INTAKE.md). Run the existing build and browser acceptance again against the actual selected release. No fictional approval may be carried into real content.
