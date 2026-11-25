# Local educator review packet

**Unapproved drafts only.** The exporter generates a single printable HTML document containing all seven original candidates (M-01–04 and E-01–03), exact source SHA-256 hashes, native math and tables, and eight blank decision fields per lesson. The source files and actual catalogue are not modified. It cannot grant or record an approval automatically.

With Node 24 and locked dependencies installed, run from the repository:

```bash
node scripts/export-educator-review.mjs > /absolute/external/review-packet.html
```

Use a new output filename outside the repository. Open it locally in a modern browser with native MathML support, then print or save as PDF using that browser if needed. In PowerShell, use `node scripts/export-educator-review.mjs | Set-Content -Encoding utf8 "D:\\Review\\review-packet.html"` in an existing external folder. The packet uses a native MathML review layout rather than the learner site's exact KaTeX font layout. It has no scripts, form submission or automatic external resources; deliberate external reference link navigation is possible. Keep completed reviewer feedback outside the public repository if it contains personal or confidential details.

Ask the actual educator to independently solve examples and practice, check class/board/year, reading level and accessibility, and record the final decision and timezone. The printed hash identifies the exact *draft* inspected; a corrected manuscript requires a new exact final hash and explicit approval. Rights and real educator identity must be independently established. Select only 4–6 approved lessons for V1. Follow the existing reviewed intake and separate publication task; this output is never a learner catalogue. Review the actual learner layout on real devices before release. No production permission follows from the report.
