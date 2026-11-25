# Skyinnk V1 — Class 10 candidate lesson review packet

**Status: ORIGINAL EDITORIAL DRAFT — NOT EDUCATOR REVIEWED, NOT APPROVED, NOT PUBLISHED.**

**Visibility distinction:** Skyinnk's GitHub repository is public. These Markdown drafts may be visible to people browsing the repository, even though they are NOT served as student lessons or listed in the site catalogue. Do not place private student data, confidential staff feedback, third-party copyrighted material or unreleased licensed assets in this review folder. Here **nonpublic** means *not published through the Skyinnk learning app*, not *a private GitHub document*.

These five draft-only text lessons are proposed for the previously agreed free/public V1 learning scope. They are kept in `docs/content-review/`, **not** in `content/catalogue.json` or `public/resources/`. They do not become public lessons merely because this pull request passes CI or is merged into the nonproduction development branch.

The subjects and examples are original, created for editorial review. They have **not** been independently checked against an identified education board, prescribed syllabus, examination pattern or school policy. All names, contexts and exercises are fictional. No third-party textbook passage, copyrighted worksheet, recording, image or media asset is included.

## Draft inventory and learning flow

| Candidate ID | Subject | Draft file | Format | Learning outcomes / self-check |
| --- | --- | --- | --- | --- |
| M-01 | Class 10 Mathematics | `math-01-pair-of-linear-equations.md` | Text + KaTeX | Interpret equations, solve by elimination/substitution, check results and recognize special cases |
| M-02 | Class 10 Mathematics | `math-02-quadratic-factorisation.md` | Text + KaTeX | Zero-product rule, factorisation, roots, meaningful applied solutions |
| E-01 | Class 10 English | `english-01-formal-email.md` | Text | Plan, draft, revise and check an appropriately formal request email |
| E-02 | Class 10 English | `english-02-reading-comprehension.md` | Original passage + questions | Distinguish stated evidence from inference, support answers with details |
| E-03 | Class 10 English | `english-03-formal-letter.md` | Text + original formal-letter model | Practise the formal-letter structure, 100–120-word main response, and responsible requests; subject educator must verify format |

The Markdown lessons start at `##` beneath the webpage title, following `docs/releases/V1-CONTENT-INTAKE.md`. They contain objectives, explanations, examples, exercises and sample solutions. No student authentication, signup, tracking or external links are required by these drafts.

## Independent curriculum-reference comparison

The original draft topics have now been compared provisionally with the **official CBSE Class X 2026–27 curriculum**. This is not board approval. Read [the curriculum-alignment gap and reviewer decision register](./curriculum-alignment-2026-27.md) before a subject educator chooses what to keep, relabel or extend. The reference explicitly flags that **formal email is a supplementary skill rather than the specified CBSE formal-letter assessment**, that the two mathematics drafts do not yet cover all graphical/quadratic-formula/discriminant outcomes, and that the reading activity is not a complete board-format unseen-passage assessment. E-03 now provides a separate **unreviewed** formal-letter draft.

## Required independent educator and content-owner review

The qualified reviewer must read **every lesson**, solve the exercises independently and decide whether the depth, notation, reading level, language and instructional approach suit the *actual* intended learners and board. A code reviewer or automated test is not a substitute for this educational review.

| Review gate | M-01 | M-02 | E-01 | E-02 | E-03 |
| --- | --- | --- | --- | --- | --- |
| Intended class, board and learning outcomes confirmed | ☐ | ☐ | ☐ | ☐ | ☐ |
| Every worked solution independently verified | ☐ | ☐ | ☐ | ☐ | ☐ |
| All practice answers independently verified | ☐ | ☐ | ☐ | ☐ | ☐ |
| Language, accessibility and age suitability reviewed | ☐ | ☐ | ☐ | ☐ | ☐ |
| Originality and public reuse rights approved | ☐ | ☐ | ☐ | ☐ | ☐ |
| Final editorial revisions approved | ☐ | ☐ | ☐ | ☐ | ☐ |

**The empty boxes are not approvals.** Reviewer identity, authority, signature or explicit approval, approval timestamp, target curriculum and final content rights remain **unprovided**.

Required final decision record for each lesson (to be completed only by an actual authorized reviewer):

| Field | Value — leave blank until verified |
| --- | --- |
| Candidate ID | |
| Intended board / applicable curriculum / audience | |
| Reviewer name, role and authority | |
| Accuracy and answer-key decision | |
| Originality / media or passage rights evidence | |
| Accessibility and age-appropriateness decision | |
| Required edits and exact final revision | |
| Explicit approval or rejection | |
| Approval date/time and timezone | |

## What happens after an actual approval

1. The educator/content owner edits the candidate draft and records the final *approved* version, with genuine name, decision, timestamp, target board and rights evidence. Keep rejected/unfinished work out of the public manifest.
2. A separate, scoped publication task creates stable safe course/module/lesson keys, public course and lesson slugs, ordered position and authentic `publication` metadata. An integrator copies only the approved lesson notes into the reviewed source format. Text-only lessons need no external video.
3. Any future PDF/TXT/image requires separate review of its actual bytes, rights, exact SHA-256, size, safe public URL and format signature. The existing read-only metadata inspector may prepare numbers but cannot approve assets.
4. Run the original content validator, all source tests, build, guest HTTP and real-browser/device accessibility checks with the **actual** approved content. Independently verify final rendered mathematics and English. 
5. Obtain separate owner authorization before any production action. No publication or merge is authorized by the existence of this packet.

**Do not prepopulate `reviewedBy`, `reviewedAt`, `status: published`, `visibility: public` or an imaginary copyright clearance.** Current public V1 catalogue remains intentionally empty until the real process is complete.

## Technical review boundary

A protected development CI pass can establish that documentation changes did not break the application. It cannot establish curriculum accuracy, independent educator signoff, actual media permissions, legal approval or real learner acceptance. The issue/PR associated with this packet must stay open until its independent review/integration acceptance criteria are genuinely met.
