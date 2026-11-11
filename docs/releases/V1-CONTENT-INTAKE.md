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

## Release procedure

The integrator transcribes approved content into `content/catalogue.json` using schemaVersion 1 and stable source keys. Course, lesson and resource publication objects require `status: published`, `visibility: public`, `reviewedBy` and ISO `reviewedAt`.

These fields record a real human approval; automated tests must never invent that approval. Synthetic fixtures live only in tests or isolated temporary copies. Drafts stay outside the public catalogue and public assets.

Run the content validator through the normal Nuxt build, run all tests, and verify actual public URLs/media/resources in browser preview before asking for release authorization. A code change is not a production publishing action.
