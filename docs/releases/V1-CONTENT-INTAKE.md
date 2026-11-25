# V1 content intake and publication review

No educational lessons have been published. The current catalogue is intentionally empty.

For each initial lesson, provide:

1. Class/subject/course title and intended learners.
2. Lesson title, module order, learning objectives and short overview.
3. Substantive Markdown notes. Start headings at `##` beneath the page title. Tables, lists, code and KaTeX `$...$` / `$$...$$` work. No embedded HTML, scripts or remote images.
4. Optional public YouTube URL and confirmation that embedding/public delivery is permitted. Text-only lessons are supported.
5. Optional reviewed PDF/TXT/PNG/JPG/JPEG/WebP files and meaningful resource names. Store only explicitly public approved files under `public/resources/public/`. Notes images must also be registered as reviewed resources.
6. Named educator reviewer, approval date/time and confirmation of accuracy, rights and intended public access.

## Suggested initial review queue

These are proposed coverage areas, not approved or published lessons.

| Audience | Candidate coverage | Required review |
|---|---|---|
| Class 10 Mathematics | Linear equations: meaning, worked example and self-check | Educator accuracy, board relevance, notation |
| Class 10 Mathematics | Quadratic equations: a simple factorisation example | Educator accuracy, prerequisites and explanation |
| Class 10 English | A clear formal email: purpose, tone and structure | Educator accuracy and original examples |
| Class 10 English | Reading comprehension: evidence for an answer | Educator accuracy and rights to the passage |
| Class 11 Commerce | Accountancy/Economics sample, only when ready | Accurate preview scope; no paid-course availability claim |

## Prepare candidate resource metadata (read-only)

Keep unapproved teaching material in a separate local staging folder, **outside** `public/resources/` and `content/catalogue.json`. After a responsible educator/rights owner reviews the material, the content integrator can inspect the final local bytes using Node 24:

```bash
node scripts/inspect-public-resource.mjs "/path/to/reviewed-worksheet.pdf" "/resources/public/lesson-one/worksheet.pdf"
```

On Windows PowerShell, a quoted Windows file path works as the first argument. The second argument must be the **intended** safe public URL (not an external link). The command prints a JSON fragment with exactly `url`, `type`, `sizeBytes` and lowercase `sha256`. It streams bytes without writing files, changing the manifest, creating approvals or copying anything into public assets. Invalid extensions, unsafe URLs, mismatched input extensions, empty files and symbolic-link input are rejected.

**This fragment is not a publication or approval record.** It intentionally contains no `key`, title, `reviewedBy`, `reviewedAt`, rights statement or `publication` object. A genuine reviewer must still approve the teaching material and its public/third-party rights. The integrator must copy the *same approved bytes* to the declared public path, supply all required human-reviewed metadata and run the existing content/build validator. The inspector verifies byte length and digest but **does not independently validate PDF/image signatures or licensing**; the normal build checks physical file format, exact digest, approved path and whether unlisted assets remain.

For a changed file, inspect the final approved bytes again and secure fresh human signoff before updating its publication record. Do not place a draft/unapproved file under public assets merely to obtain its digest.

## Release procedure

The integrator transcribes approved content into `content/catalogue.json` using schemaVersion 1 and stable source keys. Course, lesson and resource publication objects require `status: published`, `visibility: public`, `reviewedBy` and ISO `reviewedAt`.

These fields record a real human approval; automated tests must never invent that approval. Synthetic fixtures live only in tests or isolated temporary copies. Drafts stay outside the public catalogue and public assets.

Record each reviewed resource's exact `sizeBytes` and lowercase `sha256`.
For example, use `sha256sum public/resources/public/worksheet.pdf` after the
reviewer approves those bytes. Review replacement files before recording a new
digest. The build checks the approved digest and a basic format signature, or
valid UTF-8 for TXT. Educator and rights review still applies to the file itself.

Run the content validator through the normal Nuxt build, run all tests, and verify actual public URLs/media/resources in browser preview before asking for release authorization. A code change is not a production publishing action.
