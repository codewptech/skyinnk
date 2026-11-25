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

The integrator transcribes approved content into `content/catalogue.json` using schemaVersion 1 and stable source keys. Course, lesson and resource publication objects require `status: published`, `visibility: public`, `reviewedBy` and ISO `reviewedAt` with an explicit timezone (for example, `2026-11-25T10:00:00+05:30` or the equivalent UTC timestamp `2026-11-25T04:30:00Z`). A local date/time without a timezone is ambiguous and rejected; record the actual approval instant, not the build host's timezone.

These fields record a real human approval; automated tests must never invent that approval. Synthetic fixtures live only in tests or isolated temporary copies. Drafts stay outside the public catalogue and public assets.

Record each reviewed resource's exact `sizeBytes` and lowercase `sha256`.
For example, use `sha256sum public/resources/public/worksheet.pdf` after the
reviewer approves those bytes. Review replacement files before recording a new
digest. The build checks the approved digest and a basic format signature, or
valid UTF-8 for TXT. Educator and rights review still applies to the file itself.

Run the content validator through the normal Nuxt build, run all tests, and verify actual public URLs/media/resources in browser preview before asking for release authorization. A code change is not a production publishing action.

## Optional read-only first-release text intake

For the initial 4–6 selected **text-only** lessons, the integrator can prepare a candidate schemaVersion 1 manifest directly from final approved Markdown files, avoiding manual copy/paste errors.

Keep a separate staging directory **outside the repository**. Put the actual final teacher-approved Markdown files there and create `reviewed-intake.json`. Use the same course/module metadata and stable keys as the normal schema. The packet has exactly:

- Root: `schemaVersion`, `courses`.
- Course: `key`, `slug`, `title`, `summary`, `audience`, `subject`, `publication`, `modules`.
- Module: `key`, `title`, `position`, `lessons`.
- Lesson: `key`, `slug`, `title`, `position`, `overview`, `notesFile` (unique simple Markdown filename), `notesSha256` (exact lowercase SHA-256 of final approved bytes), `publication`.

Supply the authentic publication record for each course and lesson yourself after actual educator and rights decisions. Hash the exact final file using `sha256sum` or PowerShell `Get-FileHash -Algorithm SHA256` (convert hex to lowercase). A hash binds the supplied reviewed version to the copied bytes; it does not prove who approved it. Do not hash an unfinished manuscript and call it approved.

Run from the repository with Node 24 and installed locked dependencies:

```bash
node scripts/prepare-reviewed-text-catalogue.mjs "/external/staging/reviewed-intake.json"
```

The command prints a candidate manifest only after validation. It rejects missing approval fields, changed bytes, unsupported fields, unsafe or symlink filenames, invalid UTF-8, known draft warnings, invalid rendered heading hierarchy, invalid parsed math and local resource references. The actual learner renderer must produce a first H2 with no H1 or skipped heading levels; fenced code examples are not treated as headings or math. Parsed TeX expressions use the existing strict technical check. This does not detect every unmatched delimiter or certify mathematical accuracy. It copies approved notes verbatim and never writes files or creates names/timestamps. Do not redirect output into the actual catalogue: inspect and review the candidate, then use a separate authorized publication task on a feature branch. The helper cannot verify teacher identity, rights, curriculum, or authenticity of a supplied approval record. The normal build validator and real browser checks remain mandatory. Media/resource lessons use the existing separate reviewed intake process, not this helper.
