# SKYINNK — Architecture Decision Log

**Project:** Skyinnk.in  
**Owner conversation:** Chat 01 — Platform Architecture HQ  
**Document version:** 3.0 — complete consolidated master  
**Last updated:** 11 November 2026  
**Status:** **AUTHORITATIVE MASTER ADL** — approved decisions through Discussions 01–19, finalized IMP-17, original ADR-001–053 and post-v1.2 ERD-01–54; later unapproved proposals and execution status explicitly segregated

> **Purpose.** Preserve architecture decisions across Chat 01 and specialist chats. This Markdown file is the durable record to store in the project repository (suggested path: `docs/architecture/ARCHITECTURE-DECISIONS.md`). ChatGPT memory is supplementary; code and production status must be separately verified.
>
> **Important:** Approval of a conceptual relationship, feature direction, or UX contract does **not** approve a specific Prisma schema, migration, API, code change, or deployment.

> **Document provenance and exclusivity (11 November 2026):** This edition is rebuilt **from the user-uploaded `ARCHITECTURE-DECISIONS(1).md`** (version 1.2, SHA-256 `490c892c6d31381291e00011b667848702397bc47185a19cef261d9ad980e1cc`). **Every earlier ADL file and assistant-generated ADL version is obsolete as a governing document**, including prior v1.0/v1.1/v1.2 exports and assistant-generated v2.0. This document alone is the updated governing ADL. Supporting source-code ZIPs, schema review artifacts and the verified Chat 02 UX handoff are _evidence/reference material_, **not competing ADLs**.
>
> **Source/approval caveat:** ADR-001–053 and the historical conceptual map below are retained from the user-selected source. Later explicit approvals in §§7–13 take precedence over lines in those historical ADRs still saying a matter was “open.” Chat 02's Discussions 01–73 are included through the **verified three-document UX handoff and archive audit**; the original 73-file UX discussion archive was not separately supplied in this task. Do not treat a reconstructed table title or illustrative image as a verbatim primary decision. No application/database/production validation is implied.
>
> **Reading order:** §7 controls precedence; §8 contains post-v1.2 approved ADRs; §9 gives every approved ERD ID; §10 gives every approved IMP ID; §§11–12 capture the 73-discussion UX contract and exclusions; §§13–16 distinguish verified source facts, unapproved candidates and pending gates. Earlier §§1–6 remain the approved _historical baseline_.

## 1. Status terminology

| Status                              | Meaning                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Approved — principle**            | User approved the architectural rule or business choice. Detailed implementation remains open.             |
| **Approved — UX scope**             | Functional behavior transferred from the Chat 02 handoff; technical implementation remains open.           |
| **Proposed / open**                 | A useful suggestion or implementation detail has not been individually finalized.                          |
| **Implemented in inspected source** | Source code contained the feature at inspection time; this alone does not verify live production behavior. |
| **Verified in production**          | Requires explicit production evidence. No new production verification is asserted in this document.        |
| **Superseded**                      | Replaced by a later approved decision. Keep the history rather than erasing it.                            |

## 2. Governing principles

- Preserve the existing Nuxt 4 / Vue / TypeScript, Nitro/H3, Auth0, Prisma, Neon PostgreSQL, and Docker foundation where technically sound. The November 2026 source inspection found authentication and database foundations but no completed academic schema.
- Prefer a modular monolith and a single application database over premature microservices and duplicate content databases.
- Keep **academic classification**, **course composition**, and **student access/progress** logically separate.
- Design for future academic offerings but implement the present requirements incrementally.
- Use server-side access enforcement; client-side hiding does not establish authorization.
- Distinguish private student material from deliberately published educator content.
- No schema migration, coding, infrastructure change, or deployment merely because an architectural proposal is documented.

## 3. Approved architecture decisions

### ADR-001 — Preserve existing application foundation

- **Status:** Approved — principle; inspected implementation foundation exists.
- **Decision:** Reuse the deployed project's Nuxt 4, Vue 3, TypeScript, Nitro/H3, Auth0 Universal Login, Prisma, Neon PostgreSQL and Docker/CI-CD architecture when appropriate. Do not rebuild the application merely because the educational frontend was initially minimal.
- **Rationale:** Limits cost, rework and operational complexity.
- **Implementation / verification:** Existing ZIP inspection identified these elements; current source revision and live production still require verification before relevant changes.

### ADR-002 — Dedicated Architecture HQ and specialist workstreams

- **Status:** Approved — working method.
- **Decision:** Chat 01 is the cross-cutting architecture and approval authority. Specialist workstreams cover UI/UX and frontend, backend/database, academic content, editorial/SEO, and QA/deployment as needed. Material architectural changes return to HQ.
- **Rationale:** Keep long UI and coding discussions from obscuring central decisions.
- **Documentation rule:** Approved decisions and verification reports should be handed back to HQ and reflected in this log.

### ADR-003 — Learning classroom architecture

- **Status:** Approved — architectural direction and transferred UX requirements.
- **Decision:** Use route-based lessons within a reusable persistent Nuxt classroom layout. Lesson URLs remain shareable and work with browser back/forward navigation; the sidebar and lesson-specific tabs (Overview, Notes, Resources, Questions) form the learning experience.
- **Constraints:** Switching tabs should not unnecessarily restart a video; text-only lessons, free previews, restricted states, mobile navigation, accessibility, and lesson progression are in scope.
- **Implementation / verification:** Not approved or verified by this ADR. Refer to the Chat 02 verified UX handoff for detailed behavioral requirements.

### ADR-004 — Identity is separate from authorization

- **Status:** Approved — principle (resolved in `issues.pptx`, slide 3).
- **Decision:** Auth0 authenticates identity; Skyinnk determines resource-specific permission through a centralized server-side authorization policy.
- **Applies to:** Courses, lessons, private resources, student doubts, published solved questions, educator/admin operations and purchase-related access.
- **Implementation requirements:** Default-deny access, resource-context checks and authorization tests; detailed API and role/entitlement rules pending.

### ADR-005 — Cashfree payments for V1

- **Status:** Approved — business/provider choice (resolved in `issues.pptx`, slide 1).
- **Decision:** Use Cashfree for online payment processing in V1, **superseding the earlier manual-payment-only plan**.
- **Security principles:** Server-created payment orders; verify provider confirmations/webhook authenticity; handle duplicate, delayed and out-of-order events; activate entitlements only after verified success.
- **Still open:** Exact integration contract, merchant onboarding/eligibility, operational charges, refunds, settlement handling, and payment schema. No claim of merchant or production readiness.

### ADR-006 — Expanded approved V1 functional scope is retained

- **Status:** Approved — scope principle (resolved in `issues.pptx`, slide 2).
- **Decision:** Retain the additional approved classroom, progress, student dashboard, private Ask a Doubt, Solved Questions, and educator workflows rather than dropping them solely to reduce V1 size.
- **Delivery rule:** Divide the full scope into independently testable increments and controlled release milestones.
- **Source-of-truth distinction:** The detailed UX behavior is reported in the verified Chat 02 handoff; technical contracts remain to be designed.

### ADR-007 — Unified, flexible academic classification

- **Status:** Approved — principle (resolved in `issues.pptx`, slide 4, and later HQ discussion).
- **Decision:** Academic classifications are independent of course composition; school and non-school courses share one extensible educational architecture. Classification can be optional and multiple where relevant.
- **Rationale:** Support Classes 6–12, different boards, CA Foundation, universal English and practical digital skills without duplicating tables or course-engine code.
- **Note:** Do not force every course to have a board or class level.

### ADR-008 — Academic relationship architecture V1.2

- **Status:** **Approved — conceptual relationships** (explicitly approved by the user on 10 November 2026).
- **Decision:** Adopt the corrected full academic, learning, student, enrollment, commerce, interaction, Solved Questions and editorial relationship map in §4.
- **Critical correction:** `AcademicCategory ↔ Course` is **N:M**, not blanket 1:N. A single _primary_ category may be designated as metadata on the course-category association.
- **Implementation / verification:** The user approved the relationship proposal, **not** a final Prisma schema or every illustrative table as mandatory for V1.

### ADR-009 — Privacy and publication boundaries

- **Status:** Approved — principle (resolved in `issues.pptx`, slide 4).
- **Decision:** Private doubts, student uploads and personal information are separate from educator-authorized public content. Private submission does not automatically grant permission to publish the content.
- **Implementation implications:** Authorization, attachment storage, publication state, review workflows, age-appropriate privacy processes and secure rendering must follow these boundaries.

### ADR-010 — Canonical Solved Questions, distinct from private doubts and practice exercises

- **Status:** Approved — transferred UX direction; technical design open.
- **Decision:** Distinguish (a) practice questions, (b) private Ask a Doubt conversations, and (c) educator-published reusable Solved Questions. A canonical published solution can be associated with multiple lessons and topics without duplicating the authored content; its access depends on the context.
- **Additional constraints:** Bookmarks do not confer access; Ask About This Solution uses the existing private doubt workflow; published revisions and draft work need explicit control.
- **Source:** Verified Chat 02 handoff / Solved Questions annex. The HQ reviewed the handoff, not independently every original UX discussion.

### ADR-011 — Editorial articles and organic discovery

- **Status:** Approved — functional direction; schema and visual design open.
- **Decision:** Support a Latest Stories & Articles section on the homepage, an article listing, detailed editorial pages with headings/images, responsive On This Page navigation, contextual counselling/mentor CTA and Suggested Reads. Editorial content can associate with courses/topics while remaining distinct from restricted learning content.
- **Principles:** SEO-friendly, mobile-first, reusable rendering and media patterns; no image mockup or specific screenshot styling is an approved design.

### ADR-012 — Prototype before bulk content creation

- **Status:** Approved — working direction.
- **Decision:** Test the classroom and learning system using approximately 3–4 sample lessons and representative free/restricted states. Replace sample material with real content later; unfinished drafts must not accidentally become public.
- **Rationale:** Validate educational workflows before producing the full library.

### ADR-013 — Markdown-based educator CMS is included in V1

- **Status:** Approved — transferred UX requirement, explicitly reaffirmed in Chat 01 on 10 November 2026.
- **Decision:** A **Markdown-based educator CMS is being built as part of the current Skyinnk project**, not deferred as an optional future CMS. Preserve the approved Solved Questions authoring, draft, preview, publish, revision and withdrawal workflows; plan current lesson/content integration without reopening the settled Markdown authoring direction.
- **Scope distinction:** The handoff establishes detailed Solved Questions CMS behavior. It does not independently prove that every course/lesson/article editing interface is implemented. The exact reuse and integration of CMS interfaces across content types requires technical design and repository verification.
- **Implementation status:** Detailed Prisma schema, Markdown rendering security, permissions, file/media handling and current code status are not verified by this decision log.

### ADR-014 — A lesson is a flexible learning unit (D03-01)

- **Status:** Approved — architectural principle, 10 November 2026.
- **Decision:** A lesson is **not synonymous with a video**. It may contain written explanations, objectives, video (optional), associated resources, practice and eligible interactions. Text-only lessons must be supported.
- **Implications:** Content, playback and progress should not require a video field to be populated. Exact schema remains open.

### ADR-015 — Markdown-first written educational content (D03-02)

- **Status:** Approved — architectural principle; aligns with ADR-013.
- **Decision:** Markdown is the primary authored text format for educational written content, integrated with the **in-scope educator CMS**. Support relevant educational extensions including tables, mathematical notation and code blocks where required.
- **Safety:** Render through a controlled safe pipeline; disable unsafe raw HTML by default unless specifically validated. Downloadable resources remain separate records rather than being embedded solely in one Markdown field.
- **Boundary:** Does not approve a specific editor library, renderer, serialization schema or storage implementation.

### ADR-016 — Learning Resource and Media Asset are separate concepts (D03-03)

- **Status:** Approved — architectural principle.
- **Decision:** A Learning Resource is an educational object (for example, Chapter 1 Revision Notes); a Media Asset is the technical file or provider reference used to deliver it. Resources may be associated with multiple lessons or courses according to the approved V1.2 relationships.
- **Implications:** Replacing a file/provider should not require changing the educational resource's identity; access rights apply at delivery as well as discovery.

### ADR-017 — Provider-independent video references (D03-04)

- **Status:** Approved — architectural principle.
- **Decision:** Avoid embedding YouTube-specific assumptions in `Course` or `Lesson`. Public/free content can use public YouTube where appropriate; premium content requires a separately selected, access-controlled delivery approach.
- **Open:** Premium hosting/provider choice, playback/token design, costs and exact media-schema fields. No absolute anti-copying guarantee is implied.

### ADR-018 — Publication and authorization are independent (D03-05)

- **Status:** Approved — architectural principle, reinforcing ADR-004 and ADR-009.
- **Decision:** Content must be eligible for release **and** the requester must have the required permission. Published paid lessons remain restricted; purchase/enrollment does not expose draft lessons. Apply server-side checks to lessons, media and download routes.

### ADR-019 — Preview is an authorized viewing mode (D03-06)

- **Status:** Approved — architectural principle.
- **Decision:** Treat Preview as an explicitly authorized educator/admin viewing workflow rather than automatically introducing a persistent `PREVIEW` status. Draft content may be viewed for review but not exposed to ordinary users through guessable routes.
- **Open:** Exact preview routes, signed preview mechanics, roles and publication enums.

### ADR-020 — Independent publication control by hierarchy level (D03-07)

- **Status:** Approved — architectural principle.
- **Decision:** Course, Module and Lesson each need appropriate lifecycle/release controls. A published course catalogue page may coexist with unpublished or unreleased modules/lessons. The UI may deliberately show an upcoming item only if explicitly configured.
- **Open:** Exact statuses, effective dates, parent-child rules, archive behavior, release sequencing and audit fields.

### ADR-021 — Paid-course invoice functionality belongs to V1

- **Status:** Approved — transferred UX requirement, explicitly reconfirmed in Chat 01.
- **Decision:** After verified Cashfree payment, provide an invoice download associated with the student's purchase, including persistent retrieval in **Student Dashboard → My Purchases**. Protect invoice access through the Skyinnk authorization layer.
- **Open:** Tax/legal requirements for the actual seller, numbering, immutable financial snapshot, PDF generation/storage, refund/correction handling, idempotency, exact schema and issuance timing. An invoice is not automatically identical to a payment receipt.

### Discussions 04–07 — Newly approved architecture principles

**Approval:** All D04, D05, corrected D06 and D07 principles were explicitly approved by the user on 10 November 2026. They are requirements/principles, not schema or deployment approval.

**D04 — Approved decisions**

### ADR-022 — Student identity and optional profile (D04-01)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Keep Auth0 as identity provider and the existing linked `User` record; add a separate optional 1:0..1 `StudentProfile` for essential educational details. Do not overload Auth0 identity fields with course-specific or unnecessary minor data.
- **Detailed design still open:** Profile lifecycle, minimum fields and parent/guardian identity/consent flows.

### ADR-023 — Enrollment and effective access (D04-02)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Enrollment is the durable student–course relationship; use one authoritative server-side policy for effective access, and do not create conflicting editable entitlement states. A separate `AccessGrant` record remains an implementation decision.
- **Detailed design still open:** Entitlement algorithm, expiration, cancellation, bundle semantics and enrollment uniqueness.

### ADR-024 — Verified idempotent Cashfree activation (D04-03)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Create and price orders server-side; verify payment outcomes via trusted Cashfree server integrations, handle retry/duplicate/out-of-order events, and activate paid access only once after verified success. Browser redirects are not payment authority.
- **Detailed design still open:** Cashfree API/webhook mapping, reconciliation, idempotency constraints, chargebacks and refunds.

### ADR-025 — Immutable order and invoice records (D04-04)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Persist purchase-line pricing, discounts, tax context and purchaser/seller details as issuance-time snapshots. Preserve invoice numbering, secure account-specific retrieval, corrections and audit history; invoice V1 functionality was already approved.
- **Detailed design still open:** Seller tax/GST applicability, invoice/credit-note policies, PDF generation and retention.

### ADR-026 — Course distinct from commercial Offering (D04-05)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Keep educational `Course` identity separate from a priced or free enrollment `Offering`; implement only needed V1 offerings without prematurely building bundle/subscription engines.
- **Detailed design still open:** Offering-to-course mappings, commercial terms, access durations and future bundles.

### ADR-027 — Backend authorization for all protected resources (D04-06)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Enforce permissions for lessons, protected files, paid materials, doubts, CMS actions, invoices and progress at the backend. Frontend states are not security boundaries.
- **Detailed design still open:** Policy matrix, educator assignments, privacy-safe error contracts and negative-access tests.

### ADR-028 — Minor/guardian-aware student and purchaser workflows (D04-07)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Minimize student data; distinguish learner from purchaser/guardian when appropriate, with age-appropriate privacy and payment flows.
- **Detailed design still open:** Exact legal/compliance implementation, consent collection and retention.

**D05 — Approved decisions**

### ADR-029 — Persistent lesson completion and derived course progress (D05-01)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Track completion per student–lesson–applicable enrollment; support verified video-end or explicit manual completion. Absence of record can mean Not Started. Derive percentage from eligible published lessons and preserve completion when courses change.
- **Detailed design still open:** Eligible denominator and changes to released lessons; duplicate events and completion certificate policy.

### ADR-030 — Private course-context doubt threads (D05-02)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Use `DoubtThread` and `DoubtMessage`, with student ownership, course context, optional lesson association, controlled educator access, revision/deletion and protected attachments. Follow the approved UI handoff.
- **Detailed design still open:** Exact message editing limits, retention and attachment validation.

### ADR-031 — Canonical revision-safe Solved Questions (D05-03)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Maintain one canonical educator-authored Solved Question with Markdown revisions, explicit published-vs-draft versions, reusable topic/lesson links and bookmarks that confer no access.
- **Detailed design still open:** Schema, revision transitions, visibility contexts and content permissions.

### ADR-032 — One doubt system for lesson and solution follow-ups (D05-04)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Use the same private doubt infrastructure for regular lesson doubts and Ask About This Solution; associate the source solution where applicable rather than building duplicate messaging.
- **Detailed design still open:** Context linking, actor authorization and query/index details.

### ADR-033 — Student activity separate from educational content (D05-05)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Keep `LessonProgress`, `DoubtThread`, bookmarks and other student activity out of course/lesson content records; reference stable content identities instead.
- **Detailed design still open:** Indexes, retention and aggregation strategy.

### ADR-034 — Central resource authorization for learning interactions (D05-06)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Apply shared server-side authorization to progress changes, private messages and files, published solutions, bookmarks, authoring and educator actions.
- **Detailed design still open:** Policy tests for cross-student and cross-course access; published-context reuse.

### ADR-035 — Minimal educational activity collection (D05-07)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Collect meaningful events such as completion, not continuous surveillance of video pause/tab clicks; keep GA/GTM data separate from authoritative learning records and subject to consent policy.
- **Detailed design still open:** Exact analytical metrics and retention.

**D06 — Approved decisions**

### ADR-036 — Preserve approved educator CMS and inbox (D06-01)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Reuse the approved Markdown/KaTeX Solved Questions CMS and private Student Doubts Inbox. Do not prescribe a duplicate dashboard or additional admin modules from an illustrative layout.
- **Detailed design still open:** Existing implementation needs code verification; educator permission design.

### ADR-037 — Shared safe Markdown components, separate domains (D06-02)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Reuse supported Markdown/KaTeX editor, preview and rendering capabilities across relevant approved content workflows while retaining distinct Lesson, SolvedQuestion, Article and DoubtMessage records.
- **Detailed design still open:** Library selection, sanitization, editor integration and content-type scope.

### ADR-038 — Solved Questions publishing lifecycle (D06-03)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Preserve Save Draft → Preview → Publish → Edit Published → Republish → Withdraw, maintaining the active published revision during editing. No unapproved scheduled publishing or parallel editor.
- **Detailed design still open:** Concurrency, revision pointers and publication audit implementation.

### ADR-039 — Metadata in Neon; media bytes elsewhere (D06-04)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Keep resource and media identities/metadata in PostgreSQL; deliver actual images, PDFs, documents and attachments from appropriate external storage/media providers.
- **Detailed design still open:** Providers, size/file limits, private bucket strategy and backups.

### ADR-040 — Provider-independent protected media delivery (D06-05)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Do not hardcode provider URLs into academic models; authorize private media delivery, isolate student attachments from public CMS pickers, and make storage providers replaceable without a separate service architecture.
- **Detailed design still open:** Signed-URL/streaming design, expiry, CDN behavior and protected premium video provider.

### ADR-041 — Approved notifications through reliable delivery (D06-06)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Support required in-app and transactional email notifications with durable state/retry, particularly on educator replies to private doubts; do not disclose private reply bodies in notification emails. Do not infer a broad new notification product from example events.
- **Detailed design still open:** Email provider, outbox/job mechanism, templates and consent boundaries.

### ADR-042 — Preserve Student Doubts Inbox behavior (D06-07)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Respect approved Pending / Answered / All views, oldest-pending-first ordering, course-specific educator permission and reply workflows; do not add mandatory overview widgets or separate error reporting dashboards.
- **Detailed design still open:** Indexes, statuses and exact permissions.

### ADR-043 — Private media and publishing permission isolation (D06-08)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Separate student doubt attachments, public editorial assets and educator publication rights. Private doubts permit up to five attachments including at most one PDF, per transferred UX contract.
- **Detailed design still open:** Media scanning, validation, ownership and retention/deletion.

**D07 — Approved decisions**

### ADR-044 — Preserve modular-monolith hosting (D07-01)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Continue using existing Nuxt/Nitro + Prisma/Neon + Auth0 + VPS/Docker baseline, introducing additional infrastructure only for demonstrated needs.
- **Detailed design still open:** Current production config and capacity verification.

### ADR-045 — Default-deny resource-level authorization (D07-02)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Use shared resource-level access checks and automate negative tests for cross-user invoices, doubts, drafts, private media and premium lessons.
- **Detailed design still open:** Detailed permission matrix and implementation contracts.

### ADR-046 — Privacy by design and minor-aware handling (D07-03)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Minimize user/guardian data, separate optional analytics consent from educational permissions, establish lawful handling, deletion/retention and appropriate safeguards for minors.
- **Detailed design still open:** Current regulatory obligations and lawyer/compliance review before launch.

### ADR-047 — Secure validated uploads and protected delivery (D07-04)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Enforce allowlisted types, true-content validation, server-side file/size limits, access checks, appropriate scanning and separate public/private media contexts.
- **Detailed design still open:** Provider-specific threat controls and limits.

### ADR-048 — Verified auditable Cashfree records (D07-05)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Ensure authenticated webhooks/verification, idempotency, reconciliation, audit history, safe invoice access and refund handling; do not treat browser return as proof of payment.
- **Detailed design still open:** Gateway integration contract, finance/legal details and production evidence.

### ADR-049 — Backups, migrations and recoverability (D07-06)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Protect Neon DB, Prisma migrations, media, configuration and financial/CMS records; require a documented recovery procedure and verified restores for relevant launch risks. Code rollback is not DB rollback.
- **Detailed design still open:** Backup frequency, RPO/RTO, recovery rehearsals and restore environment.

### ADR-050 — Risk-based testing and truthful verification status (D07-07)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Validate authentication, authorization, payments, CMS, progress, doubts, solutions, accessibility and key user journeys with proportionate tests; distinguish code presence, local tests, CI, staging and production evidence.
- **Detailed design still open:** Release gate acceptance criteria and actual results.

### ADR-051 — Private/public caching, consent and monitoring (D07-08)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Cache public content deliberately, never share-cache personalized pages, private drafts, payment records or private support; apply consent-aware analytics and safe minimal logs/operational monitoring.
- **Detailed design still open:** Cloudflare/edge rules, analytics consent implementation and log retention.

### ADR-052 — Affordable infrastructure and operational discipline (D07-09)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Prefer existing managed stack and low-overhead extensions; justify supporting vendors and background workers by cost, privacy, reliability and operating effort, not just free-tier pricing.
- **Detailed design still open:** Provider quotations and capacity assumptions.

### ADR-053 — Historical integrity across course changes (D07-10)

- **Status:** Approved — architecture principle, 10 November 2026.
- **Decision:** Preserve stable content IDs, course-completion history, historical purchased terms, prices, invoices and transactions when content is edited, archived or withdrawn.
- **Detailed design still open:** Course withdrawal/refund policy and historical snapshot model.

## 4. Approved historical conceptual relationship map — V1.2

> **Precedence:** The later approved ERD decisions in §9 refine this original conceptual map. The early `AccessGrant` candidate is not the V1 entitlement authority (ERD-18). Later `LessonProgress` and `DoubtThread` reference Enrollment context (ERD-20/22). Illustrative table names are not automatically mandatory physical models.

**Notation:** `1:N` = one-to-many, `N:1` = many-to-one, `N:M` = many-to-many, `1:0..1` = optional one-to-one. Cardinality does not by itself say whether the relationship is mandatory; optionality, constraints and deletion behavior remain to be specified in the final schema.

### 4.1 Academic classification

| Entity A           | Entity B        | Cardinality | Candidate implementation / note                    |
| ------------------ | --------------- | ----------- | -------------------------------------------------- |
| Academic Category  | Course          | **N:M**     | `CourseCategory`; may mark one primary association |
| Academic Level     | Course          | **N:M**     | `CourseLevel`                                      |
| Board / Curriculum | Course          | **N:M**     | `CourseCurriculum`                                 |
| Subject            | Course          | **N:M**     | `CourseSubject`; may designate primary subject     |
| Subject            | Topic           | **N:M**     | `SubjectTopic`                                     |
| Topic              | Subtopic        | **1:N**     | Candidate self-reference `Topic.parentId`          |
| Topic              | Lesson          | **N:M**     | `LessonTopic`                                      |
| Topic              | Solved Question | **N:M**     | `SolvedQuestionTopic`                              |

**Interpretation:** Classification records are independent of a course's teaching sequence. For example, a universal English course may have no board, and a course may be relevant to more than one level or curriculum. A primary category/subject is a _designation inside an N:M association_, not a replacement of N:M with 1:N.

### 4.2 Courses and resources

| Entity A          | Entity B          | Cardinality                           | Candidate implementation / note                |
| ----------------- | ----------------- | ------------------------------------- | ---------------------------------------------- |
| Course            | Module            | **1:N**                               | `Module.courseId`                              |
| Module            | Lesson            | **1:N**                               | `Lesson.moduleId`                              |
| Lesson            | Learning Resource | **N:M**                               | `LessonResource`                               |
| Course            | Learning Resource | **N:M**                               | `CourseResource`                               |
| Lesson            | Topic             | **N:M**                               | `LessonTopic`                                  |
| Lesson            | Practice Question | **N:M**                               | `LessonPracticeQuestion`                       |
| Course            | Practice Question | **N:M**                               | `CoursePracticeQuestion`                       |
| Lesson            | Solved Question   | **N:M**                               | `LessonSolvedQuestion`                         |
| Course            | Solved Question   | **N:M** (optional direct association) | `CourseSolvedQuestion` if needed               |
| Learning Resource | Media Asset       | **N:1** (optional)                    | Media reference or external provider reference |

**V1 composition rule:** A module belongs to one course and a lesson belongs to one module. Reusable assets/questions/solutions may be shared, but never bypass access checks. Module can display as “Chapter” or “Unit” depending on the course.

### 4.3 Identity, student records and roles

| Entity A        | Entity B         | Cardinality                 | Candidate implementation / note                         |
| --------------- | ---------------- | --------------------------- | ------------------------------------------------------- |
| User            | Student Profile  | **1:0..1**                  | Unique nullable-in-practice student profile association |
| User            | Role             | **N:M**                     | `UserRole`                                              |
| User (Educator) | Course           | **N:M**                     | `CourseEducator`                                        |
| User            | Enquiry          | **1:N**, optional user link | Enquiry may come from visitor                           |
| Enquiry         | Follow-up Record | **1:N**                     | `EnquiryFollowUp`                                       |

Keep existing Auth0-linked `User` identity; do not conflate user roles, profile, enrollment and payment identity.

### 4.4 Enrollment, entitlement and Cashfree commerce

| Entity A          | Entity B        | Cardinality           | Candidate implementation / note                 |
| ----------------- | --------------- | --------------------- | ----------------------------------------------- |
| Student Profile   | Enrollment      | **1:N**               | `Enrollment.studentId`                          |
| Course            | Enrollment      | **1:N**               | `Enrollment.courseId`                           |
| Student Profile   | Course          | **N:M**               | Via `Enrollment`                                |
| Student Profile   | Order           | **1:N**               | `Order.studentId`                               |
| Order             | Order Item      | **1:N**               | `OrderItem.orderId`                             |
| Course / Offering | Order Item      | **1:N**               | `OrderItem.offeringId`                          |
| Order             | Payment Attempt | **1:N**               | `PaymentAttempt.orderId`                        |
| Payment Attempt   | Payment Event   | **1:N** where matched | Provider event relationship                     |
| Enrollment        | Access Grant    | **1:N** (candidate)   | Evaluate whether separate grant table is needed |

**Nonnegotiable:** Payment success must be verified server-side; a client return URL, screenshot or unverified callback cannot grant access. Decide whether Enrollment or AccessGrant is the authoritative entitlement before implementation—never maintain two contradictory access states.

### 4.5 Progress and private academic support

| Entity A             | Entity B             | Cardinality           | Candidate implementation / note  |
| -------------------- | -------------------- | --------------------- | -------------------------------- |
| Student Profile      | Lesson Progress      | **1:N**               | `LessonProgress.studentId`       |
| Lesson               | Lesson Progress      | **1:N**               | `LessonProgress.lessonId`        |
| Student Profile      | Lesson               | **N:M**               | Via `LessonProgress`             |
| Student Profile      | Private Doubt Thread | **1:N**               | `DoubtThread.studentId`          |
| Course               | Private Doubt Thread | **1:N**               | `DoubtThread.courseId`           |
| Lesson               | Private Doubt Thread | **1:N**, optional     | `DoubtThread.lessonId` nullable  |
| Private Doubt Thread | Message              | **1:N**               | `DoubtMessage.threadId`          |
| User                 | Doubt Message        | **1:N**               | `DoubtMessage.authorId`          |
| Doubt Message        | Attachment           | **1:N**               | `DoubtAttachment.messageId`      |
| Doubt Message        | Revision             | **1:N** when retained | `DoubtMessageRevision.messageId` |

Uniqueness of progress in its relevant enrollment context, exact access rules, and message revision/retention semantics require schema-stage decisions.

### 4.6 Canonical Solved Questions

| Entity A        | Entity B             | Cardinality      | Candidate implementation / note |
| --------------- | -------------------- | ---------------- | ------------------------------- |
| Solved Question | Revision             | **1:N**          | `SolvedQuestionRevision`        |
| Solved Question | Topic                | **N:M**          | `SolvedQuestionTopic`           |
| Solved Question | Lesson               | **N:M**          | `LessonSolvedQuestion`          |
| Solved Question | Course               | **N:M** optional | `CourseSolvedQuestion`          |
| Solved Question | Media Asset          | **N:M**          | `SolvedQuestionMedia`           |
| Student Profile | Solved Question      | **N:M**          | `SolvedQuestionBookmark`        |
| Solved Question | Private Doubt Thread | **1:N** optional | Link into existing doubt system |

A single canonical solution may be reused but published/authorized in explicit contexts. A bookmark never grants access.

### 4.7 Public articles and editorial system

| Entity A | Entity B         | Cardinality                     | Candidate implementation / note |
| -------- | ---------------- | ------------------------------- | ------------------------------- |
| Article  | Article Category | **N:M**                         | `ArticleCategoryLink`           |
| Article  | Tag              | **N:M**                         | `ArticleTag`                    |
| Article  | Author (User)    | **N:1** optional                | `Article.authorId`              |
| Article  | Media Asset      | **N:1** optional featured image | `Article.featuredMediaId`       |
| Article  | Article          | **N:M**                         | `RelatedArticle`                |
| Article  | Course           | **N:M**                         | `ArticleCourse`                 |
| Article  | Topic            | **N:M**                         | `ArticleTopic`                  |

Articles are public editorial objects and not the same entity as private doubts or course-protected Solved Questions.

### 4.8 Publication and media (conceptual, not automatically tables)

| Relationship / attribute                       | Conceptual shape                 | Implementation caution                                                            |
| ---------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| User → authored content                        | 1:N                              | Author fields may exist on each content model                                     |
| Course / Lesson / Article → publication status | Many records to one status value | Prefer status fields/enums initially, not mandatory lookup tables                 |
| Media Asset → storage provider                 | Many assets per provider         | Configuration/provider key may suffice; do not automatically add a provider table |
| Media Asset → usage associations               | 1:N where modeled                | Preserve stable media identity across provider changes                            |

## 5. Discussion 03 content/publication architecture — approved decisions

The user explicitly approved **all seven D03 principles** in Chat 01 on 10 November 2026. They are recorded as ADR-014 through ADR-020. The Markdown CMS itself is an existing V1 decision, reaffirmed as ADR-013; invoices are separately preserved as ADR-021.

| Discussion ID | ADR     | Approved principle                                | Design detail still pending                |
| ------------- | ------- | ------------------------------------------------- | ------------------------------------------ |
| D03-01        | ADR-014 | Lesson is a flexible unit; video optional         | Fields and exact API contract              |
| D03-02        | ADR-015 | Markdown-first authored text and CMS integration  | Editor/renderer and sanitization specifics |
| D03-03        | ADR-016 | Resource is distinct from Media Asset             | Final models and file permissions          |
| D03-04        | ADR-017 | Provider-independent video reference              | Premium provider and playback protection   |
| D03-05        | ADR-018 | Publication separate from authorization           | Central policy and release checks          |
| D03-06        | ADR-019 | Preview is an authorized mode                     | Preview flow/roles and lifecycle enum      |
| D03-07        | ADR-020 | Independent course/module/lesson release controls | State transitions and scheduling           |

These are **approved requirements/principles**, **not** approval to run Prisma migrations or deploy code.

## 6. Implementation design rules accepted in principle

1. Use stable IDs independent of editable titles and slugs. Preserve compatibility with the project's existing UUIDv7/PostgreSQL strategy.
2. Use explicit junction tables where relationships carry ordering, primary designation, access context, or publication metadata.
3. Define appropriate uniqueness constraints (e.g., for a course/category pair), indexes, optionality and referential deletion behavior before migrations.
4. Do not cascade-delete financial history or important audit records merely because a course or user-facing item is archived.
5. Draft and public publishing status do not override course access rules; publication and authorization are distinct checks.
6. Protect private files via server-validated access, not simply by hiding links.
7. Reuse approved application infrastructure and avoid building unnecessary optional models before real V1 workflows need them.
8. Interpret all example table names above as **candidate names**, not an approved physical schema.

## 7. Binding precedence, approval boundaries and current source of truth

### 7.1 Rules in force (latest approval governs)

1. **Application-source authority:** The latest audited application snapshot is `skyinnk-copy(1).zip` (SHA-256 `d9729ff87676a4422d81528ff76c39f0b32cdaa26ac8b610c4fb78dcb9304356`). It supersedes older **application source** archives. This is separate from the master ADL's document-version precedence.
2. **Schema reference, not implementation:** `Skyinnk-Schema-Repair-V4-Reviewed.zip` is the latest **candidate database review package** (66 candidate Prisma models, not production tables), superseding earlier schema repair candidates. Neither static checks nor repeated source repair establish Prisma 6.19.3/PostgreSQL 18 executable validity.
3. **UUID identity:** Every newly generated independent internal entity uses **PostgreSQL 18 database-generated UUIDv7**, native PostgreSQL `UUID`, with Prisma v6.19.3 `id String @id @default(dbgenerated("uuidv7()")) @db.Uuid`. Composite FK primary keys on pure junctions are allowed; Auth0/Cashfree IDs stay external. Existing IDs must not be regenerated. Any genuinely unavoidable exception needs justification and explicit approval (**ERD-38**).
4. **One enrollment authority:** One canonical Enrollment per student/course with **non-expiring V1 course access**. Effective access is server-calculated; no parallel editable `AccessGrant` entitlement table in V1 by default (**ERD-14, ERD-18**). This supersedes older unresolved options in ADR-023 / the original relationship map.
5. **Forever-protected enrolled courses:** Once any first _free or paid_ enrollment exists, ordinary permanent course deletion is prohibited; durable protection cannot be defeated by subsequently removing enrollment rows. Required lessons, resources, media and learning history must remain deliverable or receive an appropriate approved replacement/remedy without another charge. Delisting, archive and stopping sales never by themselves revoke access (**ERD-29–32, IMP-10**).
6. **Immutable purchased-course membership:** Commercial Offering definitions may evolve, but the order's actual purchased courses, prices and terms must remain historically recoverable. `OrderItemCourse` is the candidate snapshot association in Schema V4; precise implementation is not yet executed/tested. Payment activation is verified and idempotent.
7. **All _Skyinnk-owned_ HTTP APIs are URL-versioned:** Existing and future Skyinnk API handlers must use `/api/v1/...` (**IMP-17**). Move owned `/api/health`, `/api/ready`, `/api/auth/sync` accordingly when separately authorized. Leave **third-party SDK-managed endpoints** (Auth0 SDK `/auth/...`) and external provider APIs unchanged; Skyinnk-owned webhook receivers remain Skyinnk-owned APIs and may use `/api/v1/webhooks/...`. This supersedes the two earlier, over-broad/opposite interpretations of IMP-17.
8. **Provider/identity and private data:** Auth0 authenticates; Skyinnk authorizes by resource, enrollment and educator scope. Private doubt content, student attachments and personal/financial records are not public CMS material. Shared caching is default-deny for private responses.
9. **Scope and implementation:** The Markdown/KaTeX educator CMS, private doubts, Solved Questions, notes/practice, Cashfree, invoices and other approved V1 workflows remain included even when implementation is phased. Approval of this document **does not** authorize migrations, code changes, cloud modifications, payment activation or deployment.
10. **Legal templates:** Current Privacy Policy and Terms of Service are **placeholder templates, not approved legal text**. They require careful replacement before public launch; rewriting is lower priority than Phase 00/API/DB readiness. Do not claim these pages have passed legal review.

### 7.2 Exactly which phases are approved?

- **Approved:** ADR-001–053 from the user's selected source; D03–D07 principles; ERD-01–54 including special ERD-29 and mandatory UUIDv7 ERD-38; implementation principles IMP-01–17, with final corrected IMP-17 wording.
- **Not explicitly approved in this conversation:** Discussion 15 proposed ERD-55–62 and further proposed ERD-63–65 as _new numbered decisions_; Discussion 20 proposed IMP-18–25; any exact V4 trigger script as release-ready; live migration/deployment. The user authorized iterative fixes to **review artifacts**, which is different from adopting every proposed constraint or authorizing production changes.
- **Approved UX scope:** Chat 02's transferred numbered Discussions 01–73, as reconciled by the verified handoff; the **Solved Questions V1 module** is specifically frozen after Discussion 73, not necessarily every future Skyinnk feature.

## 8. Additional formally approved ADRs since the selected v1.2 source

The original **ADR-001–053 remain preserved unchanged in §3** (except prominent current-precedence notices). These new ADRs record subsequent explicit approvals. A grouped ADR does **not replace** its originating individual ERD or IMP decisions; consult §9 or §10 for every individual ID.

### ADR-054 — Academic core physical relationship rules (Discussion 08)

- **Status:** Approved — technical design (**ERD-01–05**).
- **Decision:** Explicit N:M classification junctions, uniqueness and bounded primary designations; Course→Module→Lesson stable hierarchy with sibling ordering; UUID identities independent of editable slugs; reusable optional parent Topic; integrity constraints and archival rather than destructive deletes for historically meaningful content.
- **Boundary:** Exact migration, composite constraints and release-time completeness remain to be executed/verified.

### ADR-055 — Learning content, resources and canonical solved content (Discussion 09)

- **Status:** Approved — technical design (**ERD-06–12**).
- **Decision:** Markdown-first optional-video lessons; LearningResource distinct from MediaAsset; explicit LessonResource/CourseResource associations; provider-independent media; one canonical SolvedQuestion with controlled revisions, lesson/topic/course associations, bookmarks; contextual access; separate Lesson/SolvedQuestion/Article domain models reusing safe Markdown tooling.
- **Boundary:** No secondary Solved Questions CMS or universal revision history imposed on every ordinary lesson.

### ADR-056 — Auth0 identities, enrollment and Cashfree commerce (Discussion 10)

- **Status:** Approved — technical design (**ERD-13–19**).
- **Decision:** Preserve Auth0-linked User, optional 1:0..1 StudentProfile and scoped role/educator assignments; canonical non-expiring Enrollment; Course separate from Offering; Order/OrderItem snapshots; PaymentAttempt/PaymentEvent verified finalization; authorized immutable invoice history and purchaser/guardian distinction; no redundant independent AccessGrant by default.
- **Boundary:** Actual gateway integration, regulatory invoice obligations and live payment tests remain pending.

### ADR-057 — Learning progress, private doubts, bookmarks and notifications (Discussion 11)

- **Status:** Approved — technical design (**ERD-20–28**).
- **Decision:** Unique progress per Enrollment/Lesson, idempotent completion and derived course percentage; enrollment-scoped private DoubtThread and messages/revisions/attachments; canonical bookmarks; retryable approved notifications; private email summaries; minimal audit and domain indexes.
- **Boundary:** Student data access is strictly owner- and educator-scope controlled.

### ADR-058 — Ever-enrolled course can never be ordinarily hard-deleted (Special Discussion)

- **Status:** **Approved — mandatory** (**ERD-29**).
- **Decision:** Any first free or paid enrollment permanently protects a course's identity, required learning access and historical academic/financial records. Administrative hard-delete is refused at application/database layers; delist/archive/stop sales is not revocation. Replacements or exceptional impossibility require appropriate remedy without charging again for what was purchased.
- **Technical note:** Foreign-key restriction alone is insufficient for an **ever-enrolled** invariant after an enrollment is removed. Durable write-once marker/guard and appropriate privileges/backup restoration are needed; implementation unverified.

### ADR-059 — Cross-domain physical integrity and safe migration (Discussion 12)

- **Status:** Approved — technical design (**ERD-30–37**).
- **Decision:** Permanent historical protection; distinguish publication/catalogue/enrollment/existing access; restrictive deletion on significant relationships; cross-course progress/doubt/entitlement consistency; immutable evidence; Prisma constraints plus narrowly justified PostgreSQL checks/triggers; preserve original Auth0 User/migration history; dependency-aware, recovery-aware migration review.

### ADR-060 — Native PostgreSQL-generated UUIDv7 only for new internal IDs

- **Status:** **Approved — mandatory** (**ERD-38**).
- **Decision:** PostgreSQL 18 `uuidv7()` generates new independent Skyinnk entity IDs; Prisma 6.19.3 declaration `String @id @default(dbgenerated("uuidv7()")) @db.Uuid`. Do not silently switch to Prisma/client-side `uuid(7)`, UUIDv4, CUID, ULID or serial IDs. Existing IDs remain unchanged; legitimate composite keys and external provider IDs retain native format.
- **Exception:** Only genuinely unavoidable, explained, explicitly approved departures.

### ADR-061 — Physical schema conventions and model-specific requirements (Discussion 13)

- **Status:** Approved — draft contract (**ERD-39–48**).
- **Decision:** Uniform UUID/FK conventions; classification/curriculum/topic/ordering constraints; lifecycle-safe course model; durable EnrollmentEvent source history; separated financial snapshots; canonical SolvedQuestion revision/featured controls; ungraded PracticeQuestion without attempt history; private learning/notification/audit; editorial content and limited Recently Explored; PostgreSQL-only enforcement when Prisma v6 is insufficient.
- **Boundary:** Field examples and enum choices were approved as **review direction**, not fully generated/validated executable schema.

### ADR-062 — Consolidated Prisma schema as a _review baseline_ (Discussion 14)

- **Status:** Approved — **review direction only** (**ERD-49–54**).
- **Decision:** Combine academic, user, learning, Solved Questions, commerce, private doubts, editorial and operations in a coherent candidate; preserve User and DB-generated UUIDv7; respect historical course/media protection; perform exact Prisma 6.19.3 and PostgreSQL 18 validation before migration.
- **Artifact status:** The iterative schema packages culminated in `Skyinnk-Schema-Repair-V4-Reviewed.zip` (66 candidate models, 39 independent UUIDv7 IDs, 27 composite-key models, as reported in prior review). Static repair passes are not executable database evidence.

### ADR-063 — Vertical phased implementation and preservation of all V1 scope (Discussion 18)

- **Status:** Approved — implementation strategy (**IMP-01–07**).
- **Decision:** Develop complete backend+database+frontend slices; verify existing repository first; preserve all V1 approved features across phases; introduce entitlements, financial and privacy safeguards alongside the features needing them; separate architecture/UX/implementation chats; require scoped handoffs, tests, and explicit approval before code/migration/deployment.

### ADR-064 — Domain APIs and resource authorization in one Nuxt/Nitro monolith (Discussion 19)

- **Status:** Approved — implementation architecture (**IMP-08–16**).
- **Decision:** Central default-deny resource authorization; separate public previews/free enrollment/paid rights; delisting does not remove prior access; domain-operation API boundaries (not raw CRUD); verified transactional Cashfree fulfillment; owner/assigned-educator private doubts; contextual Solved Questions; no private SSR/API/CDN caching; well-scoped internal services without microservice proliferation.

### ADR-065 — Mandatory `/api/v1/` for all Skyinnk-owned HTTP APIs (final IMP-17)

- **Status:** **Approved — final user clarification**.
- **Decision:** Every Skyinnk-owned API, **including already existing custom routes**, is versioned under `/api/v1/`. External provider HTTP APIs and Auth0 SDK-managed endpoints remain unchanged. Skyinnk-owned Cashfree webhook receivers fall under owned API routing. Update all callers, tests, rate limits and deployment health checks together when migration is separately authorized.
- **Existing owned route inventory in the inspected snapshot:** `GET /api/health` → `/api/v1/health`; `GET /api/ready` → `/api/v1/ready`; `POST /api/auth/sync` → `/api/v1/auth/sync`.
- **Superseded interpretations:** Both "leave existing `/api/auth/sync` as a permanent exception" and "force third-party Auth0 SDK routes into `/api/v1/`" were expressly corrected and **must not reappear**.

### ADR-066 — Current application-source reconciliation and proof boundaries

- **Status:** Approved — working method/recent documented baseline; not a source-code change.
- **Decision:** Use the latest current source `skyinnk-copy(1).zip` for implementation planning, not older application snapshots. Its inspected `prisma/schema.prisma` contains the original Auth0-linked User only; the academic/schema V4 models have **not** been implemented. Preserve existing migrations, Auth0 sync, GTM, lightweight Node tests and deployment config.
- **Evidence limitation:** This is a snapshot audit, not a production inspection, real Auth0 user flow or completed Prisma/PostgreSQL integration validation.

### ADR-067 — Existing legal pages are unapproved templates

- **Status:** Approved — explicit user clarification; **lower implementation priority**, launch requirement outstanding.
- **Decision:** Current Privacy Policy and Terms of Service text is placeholder content, not legally reviewed or final. Leave it unchanged during current Phase 00 unless separately authorized; later carefully replace in accordance with actual operations, minors, consent, payments, invoices, refunds and lifetime-access terms before public launch.

### ADR-068 — Chat 03 implementation coordination boundary

- **Status:** Approved — working structure; handoff prepared, implementation not yet authorized.
- **Decision:** Chat 01 owns architecture/major approval; Chat 02 owns approved UX and frontend specifications; Chat 03 handles actual code, Prisma, APIs and verification against the latest source and approved handoffs. Material cross-contract conflicts return to Chat 01; no autonomous broad redesign or production changes.

## 9. Complete approved ERD decision register — ERD-01 through ERD-54

**Every identifier below was explicitly approved** in the corresponding Chat 01 discussion or special approval, but that approval has different depth: ERD-01–38 are physical-design rules/principles; ERD-39–48 are a candidate **schema contract**; ERD-49–54 approve a **review baseline**. None alone grants permission to change the app/database. The `ERD-29` special deletion decision and `ERD-38` UUIDv7 requirement are mandatory. The original conceptual relationship map in §4 is preserved for historical context.

| ID         | Approved in   | Binding decision / technical direction                                                                               |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| **ERD-01** | 08            | Explicit course/classification N:M junctions; unique pair and at-most-one primary designation where configured.      |
| **ERD-02** | 08            | Course 1:N Module 1:N Lesson; stable parent IDs and position ordering.                                               |
| **ERD-03** | 08            | Stable UUID database IDs distinct from editable names/slugs; preserve progress and links.                            |
| **ERD-04** | 08            | Reusable Topic with optional self-referential parent; Topic↔Lesson and Topic↔Subject associations.                   |
| **ERD-05** | 08            | Explicit uniqueness, indexes, restrictive deletion, safe archival and draft-vs-published completeness rules.         |
| **ERD-06** | 09            | Markdown-first Lesson with optional video and independently linked resources.                                        |
| **ERD-07** | 09            | Explicit reusable LessonResource/CourseResource N:M associations with ordering and access context.                   |
| **ERD-08** | 09            | Provider-independent MediaAsset metadata and protected delivery; actual bytes outside PostgreSQL.                    |
| **ERD-09** | 09            | Canonical SolvedQuestion, revision-safe Markdown publication, topic/lesson links and bookmarks.                      |
| **ERD-10** | 09            | Contextual authorization for reusable solutions; academic links are not entitlements.                                |
| **ERD-11** | 09            | Separate publication/access checks and protected previews through Course→Module→Lesson hierarchy.                    |
| **ERD-12** | 09            | Shared safe Markdown/CMS utilities; distinct Lesson/SolvedQuestion/Article domains.                                  |
| **ERD-13** | 10            | Preserve Auth0-linked User; optional StudentProfile and scoped UserRole/CourseEducator associations.                 |
| **ERD-14** | 10            | One canonical Enrollment per student/course; V1 lifetime/non-expiring access and historical continuity.              |
| **ERD-15** | 10            | Course distinct from commercial Offering; immutable OrderItem purchased terms/amount snapshots.                      |
| **ERD-16** | 10            | Separate Cashfree Order/PaymentAttempt/PaymentEvent; server verification and idempotent transaction finalization.    |
| **ERD-17** | 10            | Permanent invoice issuance snapshot, correct actual purchaser vs student, secure retrieval and corrections.          |
| **ERD-18** | 10            | Enrollment authoritative V1 course entitlement; do not introduce redundant AccessGrant by default.                   |
| **ERD-19** | 10            | Database uniqueness, auditability and preservation of historical financial/enrollment records.                       |
| **ERD-20** | 11            | One Enrollment-linked LessonProgress per lesson; idempotent hybrid completion, no undo.                              |
| **ERD-21** | 11            | Course percent derived from currently eligible published/released lessons, preserving past completions.              |
| **ERD-22** | 11            | Private enrollment-scoped DoubtThread with optional Lesson/SolvedQuestion context; Pending/Answered inbox.           |
| **ERD-23** | 11            | DoubtMessage/revisions/deletion and private files; enforce approved attachment limits server-side.                   |
| **ERD-24** | 11            | Canonical student↔SolvedQuestion bookmark with unique pair; bookmark never grants content access.                    |
| **ERD-25** | 11            | Central approved in-app notification and retryable email delivery records.                                           |
| **ERD-26** | 11            | Notification email excludes private reply body; protected links require session/authorization.                       |
| **ERD-27** | 11            | Minimal important admin/security audit records; avoid indiscriminate learning surveillance.                          |
| **ERD-28** | 11            | Composite uniqueness, practical indexes, and cross-course/ownership validation beyond FKs.                           |
| **ERD-29** | Special       | Any first free/paid enrollment permanently prohibits normal Course hard-delete and loss of promised learning access. |
| **ERD-30** | 12            | Write-once historical course protection, DB guards and protected dependent content.                                  |
| **ERD-31** | 12            | Independent publication, public catalogue listing, new-enrollment availability and existing entitlement.             |
| **ERD-32** | 12            | Explicit restrictive FK deletion for valuable history; no cascade loss of purchases/progress.                        |
| **ERD-33** | 12            | Central transactional validation of academic, enrollment, payment and publication context.                           |
| **ERD-34** | 12            | Differentiate editable operational records, historical evidence and immutable snapshots.                             |
| **ERD-35** | 12            | Use Prisma for native constraints and limited PostgreSQL SQL for partial indexes/triggers/checks.                    |
| **ERD-36** | 12            | Extend—not replace—existing Auth0-linked User, DB identity, sync and migration history.                              |
| **ERD-37** | 12            | Dependency-aware reviewed migrations, recovery checks and separate production authorization.                         |
| **ERD-38** | UUID approval | Mandatory DB-generated PostgreSQL 18 uuidv7() for new independent internal IDs; qualified exceptions only.           |
| **ERD-39** | 13            | Consistent UUIDv7 entity IDs, UUID FK types and composite junction identities.                                       |
| **ERD-40** | 13            | Physical academic fields, uniqueness, ordering and separate course lifecycle state flags.                            |
| **ERD-41** | 13            | Course write-once historical protection and continued required learning content.                                     |
| **ERD-42** | 13            | Durable EnrollmentEvent provenance; keep one canonical Enrollment record.                                            |
| **ERD-43** | 13            | Separate commerce records, immutable transaction and invoice snapshots, verified references.                         |
| **ERD-44** | 13            | Canonical solution revision ownership and up-to-three featured links per lesson.                                     |
| **ERD-45** | 13            | Simple ungraded PracticeQuestion with explanation; no stored practice-attempt history in V1.                         |
| **ERD-46** | 13            | Scoped private learning support, notification/audit records and minimal activity collection.                         |
| **ERD-47** | 13            | Distinct editorial system and up-to-three Recently Explored course records; avoid reading-history telemetry.         |
| **ERD-48** | 13            | Narrow PostgreSQL constraints when Prisma 6.19.3 cannot represent critical invariants.                               |
| **ERD-49** | 14            | Consolidated schema _review baseline_, preserving existing User and PostgreSQL-generated UUIDv7.                     |
| **ERD-50** | 14            | Canonical Enrollment and durable history in consolidated candidate.                                                  |
| **ERD-51** | 14            | Protect enrolled courses and required content from destructive deletion.                                             |
| **ERD-52** | 14            | Canonical revision-safe Solved Questions with featured associations and publishing constraints.                      |
| **ERD-53** | 14            | Maintain separate commerce, media, doubts, editorial domains in one schema.                                          |
| **ERD-54** | 14            | Require Prisma 6.19.3 + PostgreSQL 18 executable validation before migration; review approval ≠ deployment.          |

### 9.1 ERD precedence clarifications and integrity invariants

- **Academic:** Category/Level/Curriculum/Subject↔Course are independent N:M associations. Primary category/subject is metadata on a relationship, not an FK that destroys N:M. Course→Module→Lesson is 1:N at each step; a lesson may be written-only. Topic is separately reusable/hierarchical and must not be conflated with module ordering.
- **Enrollment:** `UNIQUE(studentId, courseId)` in the candidate; a course's title/slug, price or public listing may change without altering its identity or a student's purchased right. V1 is non-expiring, subject to legitimate documented restrictions/remedies; a refunded transaction is not a blanket deletion of an enrollment's history.
- **Progress:** `UNIQUE(enrollmentId, lessonId)` with verification that the Lesson belongs to the Enrollment's Course; video natural end or manual completion; no automatic undo; derive percentage from eligible released lessons; last opened eligible Lesson is separate from exact playback second.
- **Payments:** A provider PaymentAttempt is not an Order; retries and duplicate events must be idempotent, server-verified and reconciled. Historical `OrderItem`/course membership cannot be reconstructed from mutable Offering. Do not assert an untested V4 trigger proves this.
- **CMS:** One canonical SolvedQuestion; draft/published revisions and their media immutable appropriately; private doubts distinct; no public content via bookmarks, return links or course associations without effective authorization.
- **Protection:** Prevent hard deletion of ever-enrolled Course even after enrollments are changed/removed; protect required educational materials and financial/student history, not just a Course row. Privileged `TRUNCATE`/DDL and backup restore are separate operational threats that FK/row DELETE triggers alone do not solve.
- **Media:** PostgreSQL stores identity/metadata and refs, external providers hold bytes. A private student attachment is never automatically eligible for public CMS publishing; protected file downloads require authorization.
- **Custom SQL:** Use explicit reviewed migrations for check/partial indexes, immutable revision guards and other DB-only policies. Existing User and migration history remain intact. Actual acceptance tests against PostgreSQL 18 are still pending.

## 10. Complete approved implementation architecture register — IMP-01 through IMP-17

**All IMP-01–17 below are approved**, including the user's final correction to IMP-17. These are governance, sequencing, security and API decisions, **not authorization to edit the repository or deploy**.

| ID         | Approval context    | Approved decision                                                                                                       |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **IMP-01** | 18                  | Deliver integrated feature slices covering database, API, authorization and approved UI, not a database-first big bang. |
| **IMP-02** | 18                  | Keep Schema V4 as an _unvalidated review candidate_, not an existing production schema.                                 |
| **IMP-03** | 18                  | Introduce required deletion/entitlement/payment/media safeguards with the first dependent features.                     |
| **IMP-04** | 18                  | Preserve all approved V1 functionality despite phased build order.                                                      |
| **IMP-05** | 18                  | Maintain separate Chat 01 architecture, Chat 02 UX, Chat 03 backend/implementation responsibilities.                    |
| **IMP-06** | 18                  | Use narrowly scoped work handoffs, acceptance criteria and separate code/deployment authorization.                      |
| **IMP-07** | 18                  | Reconcile the latest repository/source before any code or migration changes.                                            |
| **IMP-08** | 19                  | Central, server-side, resource-specific, default-deny authorization for SSR/API/CMS/media.                              |
| **IMP-09** | 19                  | Treat public previews, explicit free enrollment and paid course entitlement as distinct rights.                         |
| **IMP-10** | 19                  | Preserve existing student access independent of public catalogue listing/archive/new sales.                             |
| **IMP-11** | 19                  | Domain-oriented narrow API operations; no unrestricted generic Prisma CRUD endpoints.                                   |
| **IMP-12** | 19                  | Use verified provider evidence + immutable snapshots + idempotent transactional enrollment fulfillment.                 |
| **IMP-13** | 19                  | Enforce owner and assigned-educator permissions on private thread/message/attachment/notification.                      |
| **IMP-14** | 19                  | Evaluate canonical solution access using genuine originating course/lesson and enrollment context.                      |
| **IMP-15** | 19                  | Consistent private SSR/JSON/media/CDN cache controls and authorized payload boundaries.                                 |
| **IMP-16** | 19                  | Logical internal service boundaries in existing Nuxt/Nitro monolith; avoid unnecessary microservices.                   |
| **IMP-17** | Final clarification | All Skyinnk-owned existing/new HTTP APIs under /api/v1; third-party SDK/provider APIs unchanged.                        |

### 10.1 Approved phased development sequence (logical workstreams, not separate launches)

- **Phase 00 — Inspect and validate:** current repository, Auth0 routes, migrations, `/api/v1` ownership map, Schema V4 against exact Prisma 6.19.3 and isolated PostgreSQL 18; prepare scoped handoffs.
- **Phase 01 — Academic foundation:** classifications, Course/Module/Lesson/Topic, ordering, and appropriate course lifecycle protection.
- **Phase 02 — Educator content/media:** Markdown lessons, approved CMS, video references, notes/resources, protected delivery.
- **Phase 03 — Student learning:** free enrollment, classroom, progress, Continue Learning, student dashboard.
- **Phase 04 — Solved Questions/private support:** canonical questions/revisions/bookmarks/practice and private doubts/inbox.
- **Phase 05 — Paid commerce:** Offering snapshots, verified Cashfree, transactional entitlements, invoices/refunds.
- **Phase 06 — Operations/editorial:** notifications, approved operational UX, public articles, SEO and consent-related functionality.
- **Phase 07 — Security/recovery/release:** cross-user denial, financial integrity, backup restore, provider integration and complete UX acceptance.

**Not permitted:** shipping real enrolled courses without durable deletion/content safeguards, or enabling paid checkout without verified transactional payment/entitlement protection. A phased plan is not permission to drop approved V1 features. User explicitly deferred implementing Schema V4 until executable validation and the appropriate development stage.

### 10.2 Final API ownership and route migration map (IMP-17)

| Inspected existing custom Skyinnk API                             | Approved owned destination                        | Connected work to update _when authorized_                           |
| ----------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/health`                                                 | `GET /api/v1/health`                              | Docker healthcheck, API tests, monitoring/documentation              |
| `GET /api/ready`                                                  | `GET /api/v1/ready`                               | CI/CD readiness probe, API tests, deployment monitoring              |
| `POST /api/auth/sync`                                             | `POST /api/v1/auth/sync`                          | Auth0 sync middleware, request limits, tests, callers                |
| Future owned course, student, educator, media, commerce endpoints | `/api/v1/...`                                     | Narrow resource-specific authorization and stable v1 contract        |
| Future **Skyinnk-owned** Cashfree callback receiver               | `/api/v1/webhooks/cashfree` (proposed route name) | Configure registered callback and trusted verification before launch |
| Auth0 **SDK-owned** `/auth/*` routes                              | **Unchanged**                                     | They are not Skyinnk-owned HTTP APIs                                 |
| External Cashfree/Auth0/provider hosted APIs                      | **Unchanged**                                     | Version their own APIs under provider rules                          |

The exact named future endpoints are **illustrative** until implemented; the `/api/v1` ownership rule is **approved**. Do not keep permanent unversioned custom API routes; plan a compatible atomic migration and test all callers. API versioning does **not** require versioning internal TypeScript services or Prisma models.

## 11. Full Chat 02 verified UX decision-by-decision register — Discussions 01–73

**Provenance:** The three-file `Skyinnk-Chat01-Verified-Handoff(1).zip` is a _supporting source_ verified from the user-provided UX archive in an earlier discussion. Its `03-Archive-Audit-and-Reconciliation.md` individually indexes 73 original discussion Markdown files and distinguishes records directly approved in their own file from earlier proposal files confirmed by later turns. We checked this handoff's index and functional annex. The original `Skyinnk_UIUX_Discussions-MD.zip` containing all 73 primary Markdown records was **not part of this latest upload**, so the rows below are **faithful consolidated descriptions, not fabricated verbatim quotes**. Their **approval status means “approved UX scope as reconciled by the verified handoff”**, not permission to implement.

### 11.1 Complete numbered decision index

| Discussion | Binding/reconciled UX decision                                                                                                                                             | Trace in verified source archive |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **UX-01**  | Route-based Previous/Next across chapter boundaries; direct authorized syllabus selection and browser-history-safe navigation; navigation itself never completes a lesson. | `Discussion-01/Discussion.md`    |
| **UX-02**  | Hybrid completion: verified natural video end OR manual Mark Complete; no Mark Incomplete/undo; text-only lesson can complete manually.                                    | `Discussion-02/Discussion_02.md` |
| **UX-03**  | One compact course progress indicator, chapter completed/total counts and lesson checkmarks in syllabus; avoid repeated overlays.                                          | `Discussion-03/Discussion_03.md` |
| **UX-04**  | Continue Learning remembers the last opened eligible lesson across sessions/devices; no exact-second video resume requirement.                                             | `Discussion-04/Discussion_04.md` |
| **UX-05**  | Full _published_ syllabus exposed for discovery with chapter tree, public-preview markers and locked indicators.                                                           | `Discussion-05/Discussion_05.md` |
| **UX-06**  | Locked lesson uses same classroom route and shell with sign-in/enrollment guidance; never send protected lesson body/media.                                                | `Discussion-06/Discussion_06.md` |
| **UX-07**  | Designated public preview lessons accessible without authentication; guests get no persisted learner progress or private doubt privileges.                                 | `Discussion-07/Discussion_07.md` |
| **UX-08**  | Wholly free courses require an explicit signed-in Enroll Free action for My Courses/progress/support; preview ≠ enrollment.                                                | `Discussion-08/Discussion-08.md` |
| **UX-09**  | Paid journey Course details → Enroll Now → sign-in if needed → checkout → verified entitlement → Start Learning.                                                           | `Discussion-09/Discussion-09.md` |
| **UX-10**  | Payment UI distinguishes Verifying, Successful and Unsuccessful; browser return alone is never trusted payment success.                                                    | `Discussion-10/Discussion.md`    |
| **UX-11**  | My Purchases preserves account-specific transaction history and authenticated Download Invoice independent of learning progress.                                           | `Discussion-11/Discussion.md`    |
| **UX-12**  | Responsive My Courses cards show enrolled courses only, progress and Start/Continue; active precede completed.                                                             | `Discussion-12/Discussion.md`    |
| **UX-13**  | Up to three Recently Explored unenrolled course previews; exploration does not grant enrollment or show as purchased.                                                      | `Discussion-13/Discussion.md`    |
| **UX-14**  | Dashboard Overview prioritizes Continue Learning/My Courses/Recently Explored; initial four nav items later superseded by five in Discussion 28.                           | `Discussion-14/Discussion.md`    |
| **UX-15**  | Minimal My Profile: name, email, optional phone, current class, avatar; avoid unnecessary minor information.                                                               | `Discussion-15/Discussion.md`    |
| **UX-16**  | Editable ordinary profile fields in Skyinnk; account email/security and identity-sensitive operations remain Auth0-managed.                                                | `Discussion-16/Discussion.md`    |
| **UX-17**  | First-time welcome without forced onboarding; explicit Explore Courses/Browse Free Lessons discovery path.                                                                 | `Discussion-17/Discussion.md`    |
| **UX-18**  | My Courses empty state displays meaningful Explore Courses/Browse Free Lessons actions, not fake enrollments.                                                              | `Discussion-18/Discussion.md`    |
| **UX-19**  | V1 free/paid enrolled course access is non-expiring/lifetime under stated legitimate terms; supersedes illustrative expiry flow.                                           | `Discussion-19/Discussion.md`    |
| **UX-20**  | Completed courses stay in My Courses at 100% with Review Course, not removed or automatically expired.                                                                     | `Discussion-20/Discussion.md`    |
| **UX-21**  | Text-only lessons reuse classroom layout with structured written content; omit empty video placeholder.                                                                    | `Discussion-21/Discussion.md`    |
| **UX-22**  | Ungraded Practice Questions: Attempt → Check Answer → Explanation; unlimited retries, no attempt-history or progress effect.                                               | `Discussion-22/Discussion.md`    |
| **UX-23**  | Notes are structured webpage/textbook reading (headings, math, examples, images, tables), not merely PDF links.                                                            | `Discussion-23/Discussion.md`    |
| **UX-24**  | Lesson-specific permitted Resources with clear Preview/Download; backend authorization on protected documents.                                                             | `Discussion-24/Discussion.md`    |
| **UX-25**  | Separate student private doubts from educator-published reviewed canonical Solved Questions; not a public student forum.                                                   | `Discussion-25/Discussion.md`    |
| **UX-26**  | Composer may suggest up to three authorized, published related solutions using simple topic/keywords; suggestions cannot block asking.                                     | `Discussion-26/Discussion.md`    |
| **UX-27**  | Practice exercises, private question threads, and published educator solution articles are three distinct domains.                                                         | `Discussion-27/Discussion.md`    |
| **UX-28**  | My Doubts becomes fifth main dashboard navigation item; do not add sixth Saved/Solved item.                                                                                | `Discussion-28/Discussion.md`    |
| **UX-29**  | Educator replies trigger in-app and transactional email notice; private answer text is omitted from email.                                                                 | `Discussion-29/Discussion.md`    |
| **UX-30**  | Private follow-ups continue same thread; student follow-up reopens Pending; educator answer marks Answered.                                                                | `Discussion-30/Discussion.md`    |
| **UX-31**  | Authorized educator has private Student Doubts Inbox, filtered Pending/Answered/All, pending oldest-first.                                                                 | `Discussion-31/Discussion.md`    |
| **UX-32**  | Classroom Questions tab My Questions shows learner’s private threads for current lesson; cross-course My Doubts elsewhere.                                                 | `Discussion-32/Discussion.md`    |
| **UX-33**  | Consistent Ask a Doubt action near lesson title across all four tabs, not obstructive overlay/floating widget.                                                             | `Discussion-33/Discussion.md`    |
| **UX-34**  | Dedicated responsive composer with genuine enrolled course/lesson context, text and optional approved attachments.                                                         | `Discussion-34/Discussion.md`    |
| **UX-35**  | Unsent question text survives specified same-browser-session navigation to suggestions and back; no claim of cross-device or unsent-file persistence.                      | `Discussion-35/Discussion.md`    |
| **UX-36**  | Images and at most one PDF, max five total files; preview/remove/replace each, text-only allowed; bytes/type checks remain backend design.                                 | `Discussion-36/Discussion.md`    |
| **UX-37**  | Submission success only after server persistence of question and accepted attachments; failures preserve recoverable draft text.                                           | `Discussion-37/Discussion.md`    |
| **UX-38**  | Educator replies use standard Markdown Write/Preview and safe KaTeX, tables, authorized references/attachments.                                                            | `Discussion-38/Discussion.md`    |
| **UX-39**  | Each author can edit own messages with Edited indicator and protected revision history; no cross-author edits.                                                             | `Discussion-39/Discussion.md`    |
| **UX-40**  | An answered question or own attached material can be edited under approved rules; edit alone need not reopen Pending.                                                      | `Discussion-40/Discussion.md`    |
| **UX-41**  | Own-message deletion requires confirmation; retain Deleted placeholder and restricted historical evidence; cannot delete others’ messages.                                 | `Discussion-41/Discussion.md`    |
| **UX-42**  | No normal whole-thread delete/archive control in V1; lawful privacy erasure handled separately.                                                                            | `Discussion-42/Discussion.md`    |
| **UX-43**  | Private conversation images preview/enlarge and PDF preview/download only after authorization.                                                                             | `Discussion-43/Discussion.md`    |
| **UX-44**  | Private doubts require active eligible enrollment; public preview/shared link cannot enable private support.                                                               | `Discussion-44/Discussion.md`    |
| **UX-45**  | Only stored Pending and Answered statuses; All is filter, no Resolved state.                                                                                               | `Discussion-45/Discussion.md`    |
| **UX-46**  | Educators manually author reusable Solved Questions in existing CMS; never auto-publicize private student doubts or add inbox publishing shortcut.                         | `Discussion-46/Discussion.md`    |
| **UX-47**  | One canonical solution body can link to multiple lessons/courses; lesson association does not duplicate content or expand entitlement.                                     | `Discussion-47/Discussion.md`    |
| **UX-48**  | Course-first library for authorized Solved Questions, with approved chapter/topic context rather than global unlocked index.                                               | `Discussion-48/Discussion.md`    |
| **UX-49**  | Dedicated canonical solution reading URL with safe origin-aware lesson return or course/library fallback.                                                                  | `Discussion-49/Discussion.md`    |
| **UX-50**  | Flexible standard Markdown/KaTeX solution body with headings, math, tables, examples and protected embedded media.                                                         | `Discussion-50/Discussion.md`    |
| **UX-51**  | Educator Draft → Preview → Publish workflow; draft and preview do not leak to students.                                                                                    | `Discussion-51/Discussion.md`    |
| **UX-52**  | Editing published solution preserves last published revision until Republish; explicit Withdraw makes content unavailable.                                                 | `Discussion-52/Discussion.md`    |
| **UX-53**  | Single private CMS Solved Questions list/editor; no second authoring platform or duplicate management screens.                                                             | `Discussion-53/Discussion.md`    |
| **UX-54**  | Withdrawn or unpublished canonical URL shows appropriate unavailable state; never leaks old article/media body.                                                            | `Discussion-54/Discussion.md`    |
| **UX-55**  | Reuse Subject/Chapter/Topic/optional Subtopic taxonomy with controlled academic associations.                                                                              | `Discussion-55/Discussion.md`    |
| **UX-56**  | Keyword search and dependent Chapter/Topic filters; clearing parent filter resets invalid child selection.                                                                 | `Discussion-56/Discussion.md`    |
| **UX-57**  | Distinct no-published-content, no-search-match, withdrawn/unavailable, forbidden/loading/error states.                                                                     | `Discussion-57/Discussion.md`    |
| **UX-58**  | Lesson Questions tab shows up to three linked eligible solutions and View All into course-scoped library.                                                                  | `Discussion-58/Discussion.md`    |
| **UX-59**  | List pagination uses Load More at approximately 20 per batch, stable nonduplicated results; filters reset pagination.                                                      | `Discussion-59/Discussion.md`    |
| **UX-60**  | No AI/popularity/difficulty/exam-type ranking/tags; avoid speculative metadata.                                                                                            | `Discussion-60/Discussion.md`    |
| **UX-61**  | Educator selects at most three featured solutions _per lesson_ using existing associations; no extra featured CMS page.                                                    | `Discussion-61/Discussion.md`    |
| **UX-62**  | Compact list row/card title with academic chapter/topic context; no unapproved summaries/badges.                                                                           | `Discussion-62/Discussion.md`    |
| **UX-63**  | Up to three related eligible solutions at bottom of solution article; omit section when none; no extra recommendation engine.                                              | `Discussion-63/Discussion.md`    |
| **UX-64**  | Course library contains All Questions/Saved switch; saved view course-scoped, no new global dashboard item.                                                                | `Discussion-64/Discussion.md`    |
| **UX-65**  | No recently read solved-question list, reading history or per-solution progress; Recently Explored _courses_ remains approved.                                             | `Discussion-65/Discussion.md`    |
| **UX-66**  | Copy Link copies canonical stable URL only, never tokens/entitlements; confirm success only when clipboard actually works.                                                 | `Discussion-66/Discussion.md`    |
| **UX-67**  | Ask About This Solution uses existing authenticated private doubt composer, genuine solution/course/lesson context and safe return.                                        | `Discussion-67/Discussion.md`    |
| **UX-68**  | Same private Ask About This Solution covers possible academic-error feedback; no public error-report system.                                                               | `Discussion-68/Discussion.md`    |
| **UX-69**  | No separate Practice This Concept panel/CTA on solution reading page; return to classroom for approved Practice Questions.                                                 | `Discussion-69/Discussion.md`    |
| **UX-70**  | No Related Topics block, no extra topic-relationship CMS; educator may add normal contextual links in Markdown.                                                            | `Discussion-70/Discussion.md`    |
| **UX-71**  | Close optional Solved Questions V1 design; consolidate and validate approved functionality, no new features/deployment.                                                    | `Discussion-71/Discussion.md`    |
| **UX-72**  | Validate complete educator and student journey, permissions, returns, states and exclusions before architecture handoff.                                                   | `Discussion-72/Discussion.md`    |
| **UX-73**  | Freeze Solved Questions V1 functional scope, deliver Chat 01 handoff; does not freeze every other future Skyinnk subsystem.                                                | `Discussion-73/Discussion.md`    |

### 11.2 UX status/supersession cases that must NOT be lost

1. **Completion:** Early manual-only mockup **superseded** by verified natural video end OR manual completion; no undo/Mark Incomplete; navigation never marks completion.
2. **Progress:** One overall course indicator + chapter counts + lesson checks; no permanent second progress strip above video.
3. **Continue Learning:** Last eligible lesson saved across devices; no exact-second playback resume requirement.
4. **Preview vs free enrollment:** Designated public guest previews do **not** create enrollment, private doubts or personal progress. Enroll Free is explicit for a free course.
5. **Purchase access:** V1 lifetime/non-expiring access supersedes early hypothetical expiry screen; course completion does not remove My Courses or purchased history.
6. **Dashboard navigation:** My Doubts was added as **fifth** main item after four-item proposals; no sixth Saved/Solved navigation item.
7. **Private question scope:** Later Discussions 34–43 supersede early text-only doubt sketch: composer + max five files/one PDF, revision history, own-message delete with placeholder, authorized previews.
8. **Doubt statuses:** **Pending / Answered**, All filter only; no Resolved, no standard whole-thread delete/archive.
9. **Canonical Solved Questions:** Private student doubt never automatically public; educator manual CMS drafts, revises, republished revision remains stable, withdraws; canonical solution reused across authorized lesson/course contexts.
10. **Recommendation limits:** Max three _manually featured per lesson_ and up to three _related at article bottom_ are separate UI placements; no AI/ranking/popularity/exam metadata and no extra CMS screen.
11. **Reading/navigation:** Linked/direct solution URLs confer no access; origin/return context must be verified. Course-specific All/Saved is approved, _not_ recently read/global saved.
12. **No unapproved solution extras:** No separate Practice This Concept section or Related Topics block. Standard contextual Markdown links are allowed where appropriately published.
13. **Freeze scope:** UX-71–73 freeze **Solved Questions V1** and hand it to Architecture HQ; they do not approve coding or certify whole-platform visual design.
14. **Illustrations:** Conceptual PNGs or assistant-created diagrams do not independently approve extra CTA, sorting, paywall, dashboard or legal features.

## 12. Detailed binding UX contracts, eligibility and explicit exclusions

### 12.1 Classroom, responsive navigation and progress

- Desktop uses collapsible **left syllabus** with course Module/Chapter→Lesson tree, active highlight, lesson check marks and compact course/chapter progress. On compact laptops/tablets the sidebar shares/resizes content width rather than unnecessarily overlaying it; on mobile it becomes an accessible drawer.
- Each lesson is its own stable route; Previous/Next follows approved order across chapter boundaries; direct authorized syllabus selection and browser Back/Forward work. The lesson layout stays consistent while four **Overview, Notes, Resources, Questions** tabs update locally without restarting the video.
- Text-only lessons omit an empty video placeholder. No mandatory multi-video playlist, auto-next-lesson playback or completion on navigation.
- Hybrid lesson completion: video at verified natural end or manual action; manual for text-only; once complete no ordinary undo. Course progress derives from eligible published lessons, chapter counts and stored completion; completed courses remain in My Courses with Review Course.
- Last opened eligible lesson persists for **Continue Learning**; there is no V1 requirement to persist exact playback seconds.

### 12.2 Discovery, paid/free enrollment and dashboard

- Guests can view full _published_ syllabus, designated public preview and locked lesson shell without protected content/media in SSR/JSON. Preview does not create account/enrollment. A signed-in user explicitly **Enroll Free** for fully free courses; private educator doubt support requires that enrollment.
- Paid UX: Course details → Enroll Now → sign-in if needed → Cashfree checkout → Verifying/Successful/Unsuccessful → verified enrollment and Start Learning, invoice and appropriate email. Delayed/pending verification is not failure; client redirect cannot grant entitlement.
- **My Courses** only includes enrolled free and paid courses; shows active first, progress, Continue/Start, and completed 100% with Review Course. Empty states provide Explore Courses / Browse Free Lessons.
- **Dashboard Overview** prioritizes Continue Learning, My Courses, ≤3 Recently Explored _unenrolled_ course previews. Dashboard's five main items include Overview, My Courses, My Purchases, My Profile and **My Doubts**.
- **Profile** limited to ordinary name, optional phone, current class, avatar and read-only/appropriately managed email; Auth0 owns sensitive account/security. Minor/guardian workflows require proper legal and architecture review.

### 12.3 Private Ask a Doubt, attachments and inbox

- Private asynchronous student↔authorized educator conversation, **not** forum, live chat, public comment or bot. Available only within eligible course enrollment. Ask a Doubt near lesson title across tabs plus Questions entry; dedicated responsive composer with genuine course/lesson context.
- Composer may suggest up to three published authorized related solutions using ordinary topic/keyword matching; suggestions never prevent submission. Unfinished text should survive supported same-browser-session navigation, _not_ promise cross-device unsent text/files.
- Text-only submission or ≤5 attachments including ≤1 PDF; each file independently preview/remove/replace. Enforce MIME/size, secure upload, concurrency and server persistence before showing successful submission.
- My Doubts cross-course, My Questions lesson subset. Only Pending and Answered states; student follow-up same thread returns to Pending, educator answer returns Answered. Editor of an answered message does not necessarily reopen.
- Each user may edit/delete **own** messages only, showing Edited or Deleted placeholder with protected revision history. No normal whole-thread delete/archive UI; exception legal erasure managed distinctly.
- Educator private Inbox Pending/Answered/All, oldest pending first, scoped to authorized courses; Markdown+KaTeX Write/Preview response; private image/PDF preview/download. Student reply notices via in-app/email **without private reply body** in email.

### 12.4 Solved Questions V1 complete functional contract

- **One canonical educator-authored solution** and stable student-readable canonical route. A Solved Question is not a private student doubt, practice attempt or automatic answer. Existing Markdown/KaTeX CMS: Save Draft → Preview → Publish → Edit Published → Republish → Withdraw; old published revision stays accessible until republish; drafts/withdrawn content inaccessible to ordinary students.
- Many lessons may associate with same solution, optionally course-scoped under approved authorization. Up to three **per-lesson manually featured** eligible solutions, others under View All course library. No extra feature-management screen.
- Course-first library, All Questions/Saved within same view, chapter/topic-dependent filters, keyword search, about 20-result Load More batches, compact title+academic context. Separate no-content, no-match, unavailable, unauthorized and error states.
- Canonical article body supports standard Markdown/KaTeX, tables, code, safe embedded media and responsive reading; up to three permitted related solutions at bottom, omit if no related results. No separate practice/topic block or AI-ranking scheme.
- Student bookmarks are personal references, not entitlements; course-specific Saved view. Canonical Copy Link contains no private token and grants no access. No article Recently Read, reading-progress telemetry, global Saved dashboard or own article sharing tracker.
- Ask About This Solution opens the **existing private doubt composer/inbox**, preserving validated solution/course/lesson context where genuine; if direct/shared entry has no valid origin use safe course/library fallback. Reporting a potential answer error stays private; no public error dashboard.
- Backend must check effective course association, enrollment, publication, SSR/API/media and cache on every protected read. A forged `courseId`, `lessonId`, `returnTo` or bookmark cannot upgrade access.

### 12.5 Explicit exclusions (do not silently reintroduce)

- Public student forum/comments, voting, live support chat, bot or automatically published private doubts.
- Separate private messaging product for Solved Questions, second educator CMS, extra Solved Question administration sidebar.
- Student Mark Incomplete, exact playback-second resume, auto-next video lesson, per-attempt practice history/graded scores, routine certificates/gamification.
- Routine subscription/course expiry in V1, extra paid-course account/navigation tabs or sixth Saved dashboard item.
- AI/popularity/difficulty/exam tags or ranking, automatic featured solution suggestions, global Saved folders, solution article Recently Read and reading progress.
- Separate solution-page Practice This Concept module, Related Topics block, Quick Summary feature, separate academic-error reporting dashboard, scheduled CMS publishing.
- Social share toolbar, referral/QR-code, export solution PDF, arbitrary new media-management dashboard.
- Unverified extra UI controls/visual content from illustrative PNGs; no speculative feature additions without Chat 01 / Chat 02 approvals.

## 13. Current application/code state versus approved design — do not confuse them

### 13.1 Authoritative inspected application snapshot (not production evidence)

| Item                                                 | Confirmed in source snapshot                                                                      | Important limitation                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Current app ZIP                                      | `skyinnk-copy(1).zip`, SHA-256 `d9729ff87676a4422d81528ff76c39f0b32cdaa26ac8b610c4fb78dcb9304356` | Source snapshot, not a Git SHA or live server audit                                        |
| Nuxt                                                 | 4.6.4; Vue 3/TS, Nitro/H3                                                                         | Does not prove hosted runtime                                                              |
| Auth0 Nuxt SDK                                       | 1.3.0, Universal Login and custom user-sync code                                                  | External Auth0 settings/session flow still require live test                               |
| Prisma                                               | 6.19.3 in package/lockfile; `User` model and native `uuidv7()` migration                          | Academic 66-model schema **not** in the actual app                                         |
| PostgreSQL target                                    | 18+ required by existing `uuidv7()` migration; Neon planned/used                                  | Production DB migration state uninspected                                                  |
| Owned APIs                                           | `/api/health`, `/api/ready`, `/api/auth/sync`                                                     | Not yet migrated to `/api/v1/`                                                             |
| Third-party routes                                   | Auth0 SDK-managed `/auth/*`                                                                       | Keep SDK route contract unchanged                                                          |
| GTM                                                  | Opt-in client plugin exists                                                                       | Consent/legal/live analytics not independently certified                                   |
| Legal pages                                          | Privacy Policy and Terms of Service template pages exist                                          | **Not approved or legally vetted**                                                         |
| Testing                                              | Lightweight Node tests, CI scripts, Docker/Compose, GitHub deployment workflow                    | Syntax inspection only during prior audit; full current CI/live verification not performed |
| Academic/domain models                               | **Not implemented** in inspected source                                                           | Approved architectural scope ≠ available backend                                           |
| Cashfree, private doubts, Solved Questions, invoices | No completed implementation evidence in source                                                    | Do not claim production readiness                                                          |

**Risk:** The inspected GitHub deployment workflow can run production deployment/migrations on pushes to `main`. Do not use a push to `main` for exploratory schema tests. Preserve `prisma/migrations/20261104000000_create_auth0_user` and current user IDs. Sync API migration must update `app/middleware/auth0-sync.ts`, tests, Docker health checks and deployment readiness probe together.

### 13.2 Schema V4 as separate candidate

- Current _candidate_ ZIP: `Skyinnk-Schema-Repair-V4-Reviewed.zip`, SHA-256 `b2afeaba500d1ca298f2da5f393f456fbb5377103882d10772f99ca44fb19825`; earlier schema repair ZIPs are obsolete **as schema candidates**, not sources for the master ADL.
- Prior review reported **66 candidate Prisma models**, **39 independent PostgreSQL-generated UUIDv7 entity IDs**, **27 composite-key junctions**, and repeated **source-only** regression checks. Reports include 72/72 source checks, 18/18 focused checks and 6/6 mutation probes. **Those checks do not execute Prisma 6.19.3 validation or PostgreSQL 18 triggers, and none establish zero defects.**
- Candidate fixes (review artifacts only) included `OrderItemCourse` purchase snapshots, course/content deletion and withdrawal safeguards, pending-checkout freezing, payment/refund guards, finalized published revisions/media, private attachment constraints, last-opened lesson, direct CourseSolvedQuestion, article associations, and audit protections. Their exact implementation and false-positive behavior must be tested; they are **not automatically independently user-approved ERD-55+ IDs**.
- V4 is **not** the current `schema.prisma`, not a replacement migration, not an approved production schema, and not a grant to execute custom SQL. Reconcile with latest source and existing migrations.

### 13.3 Business and implementation priority (current)

1. Complete Phase 00 evidence collection and ownership inventory; plan owned API move to `/api/v1/`, preserving existing Auth0 SDK routing.
2. Validate corrected candidate with **exact Prisma 6.19.3**; generate client; review diff/SQL; execute key constraint and concurrency scenarios against an **isolated PostgreSQL 18 database**.
3. Define narrowly scoped Phase 01 Academic Foundation implementation with deletion-protection dependencies; seek separate approval before changes.
4. Build approved V1 vertical slices, including Cashfree/invoice safety before real payments; verify student privacy, media delivery and recovery before corresponding launches.
5. Later replace placeholder legal pages with carefully prepared, reviewed terms/policies before public launch; do not claim existing pages final.

## 14. Not-approved decisions and unresolved implementation details — mandatory separation

**Do not silently promote proposals below into binding ADRs.** Some were explored during Discussion 15 and some were included as _candidate files_ after user instructions to fix review artifacts. The user did **not** explicitly approve the new ERD numbers as a complete implementation-ready contract. Already approved underlying principles from §9 remain binding regardless.

### 14.1 Discussion 15 proposals / V4 repair candidates

| Proposal ID | Proposed technical refinement                                                                                                                                    | Status                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **ERD-55**  | Immutable purchased-course snapshots (`OrderItemCourse`) and exactly matched checkout fulfillment; proposed in Discussion 15, later revised within V4 candidate. | **Proposed / review-artifact only** |
| **ERD-56**  | One effective educator-course role per assignment unless simultaneous roles justify a different key; not individually approved.                                  | **Proposed / review-artifact only** |
| **ERD-57**  | Represent direct course-scoped Solved Questions where needed without duplicate canonical article content; exact physical association not fully approved.         | **Proposed / review-artifact only** |
| **ERD-58**  | Finalize complete Cashfree Order vs PaymentAttempt transitions, retries, duplicate events and refunds; technical contract still needs live/provider tests.       | **Proposed / review-artifact only** |
| **ERD-59**  | Enforce message attachment limits transactionally, including concurrent edits and retained private revision assets.                                              | **Proposed / review-artifact only** |
| **ERD-60**  | Protect course dependent required media/content under archive/delete/withdrawal; executable and operational validation pending.                                  | **Proposed / review-artifact only** |
| **ERD-61**  | Retain history models but remove unjustified speculative V1 tables; model-count target is not approved.                                                          | **Proposed / review-artifact only** |
| **ERD-62**  | Require complete Prisma/PostgreSQL/business acceptance evidence before migration; execution not completed.                                                       | **Proposed / review-artifact only** |
| **ERD-63**  | Central cross-domain entitlement consistency beyond valid FKs (course/lesson/payment/solution context).                                                          | **Proposed / review-artifact only** |
| **ERD-64**  | Finalized Solved Question revision + its media must be immutable and republished atomically.                                                                     | **Proposed / review-artifact only** |
| **ERD-65**  | Persist last eligible opened lesson for Continue Learning without detailed tracking/telemetry.                                                                   | **Proposed / review-artifact only** |

### 14.2 Discussion 20 Phase 00 proposals — **not explicitly approved**

Discussion 20 was presented as proposed IMP-18–25. The user subsequently provided the latest application code and requested a Chat 03 onboarding handoff, **not an explicit blanket approval of IMP-18–25**. These remain sensible **proposed execution gates**, while the underlying approved rules (source reconciliation, API versioning, schema validation before migration, no unapproved deployment) already govern.

| Proposal   | Phase 00 proposal                                                         | Status                                                |
| ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| **IMP-18** | Current repository and deployed-state baseline before edits.              | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-19** | Complete ownership inventory and `/api/v1/` migration map.                | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-20** | Validate Schema V4 using exactly Prisma 6.19.3.                           | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-21** | Execute protective SQL and concurrency tests on disposable PostgreSQL 18. | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-22** | Preserve User, Auth0 sync and original migration history.                 | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-23** | Use V4 acceptance plan as initial targeted DB-integrity test source.      | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-24** | Evidence-based Phase 00 completion gates; do not quietly pass failures.   | **Proposed, not explicitly approved as numbered IMP** |
| **IMP-25** | Narrow Phase 01 implementation handoff after validation.                  | **Proposed, not explicitly approved as numbered IMP** |

### 14.3 Open / unverified areas; no invented approvals

**Executable database correctness:** Schema V4 Prisma 6.19.3 parse/validate/generate not confirmed; PostgreSQL 18 SQL/triggers, partial indexes, FK direction, overlapping triggers, concurrency and transaction tests not run; no restore rehearsal. Source-level “passed” checks are not proof of deployed integrity.

**Purchase and financial behavior:** Actual Cashfree merchant eligibility, API/webhook schemas, real provider verification, refund/chargeback mapping, duplicate successful payments, partial refund allocation, tax/GST registration, legal seller, invoice/credit-note number strategy and immutable document issuance need exact contracts and verification. Historical order-item membership is mandatory by intent; precise V4 implementation must be exercised.

**Historical course and media protection:** Enrolled-course and required-material deletion restrictions must be tested against DELETE, UPDATE, publication withdrawal, unlinking, provider asset deletion, schema migration privileges, TRUNCATE/DDL by privileged actors, archival and restoration. Normal improvement of lessons should remain possible; an overbroad SQL trigger that blocks legitimate edits is a defect, not a desirable protection.

**Content revision/performance:** Ownership/atomic publish of Solved Question revisions and referenced media, CMS concurrency, safe Markdown/KaTeX rendering, allowed HTML/link policy, cache invalidation, lesson/resource reuse and pagination search performance require implementation decisions/tests.

**Private student support:** Actual upload file size/MIME, type sniffing, malware controls, retention/erasure, access checks, revision history and concurrency against five/one-PDF limits need implementation. Educator course-assignment semantics are not fully fixed by an approved single-key proposal.

**Academic taxonomy/editorial:** Topic hierarchy cycles, curriculum-specific same-named concepts, slug uniqueness/redirects, status enumerations, primary category publication requirements, direct course↔solution/practice associations and article editorial CMS details need exact schema reconciliation; do not assume all original candidate junctions are mandatory V1 tables.

**Privacy, minors and legal:** Guardian/age consent mechanics, legal notice text, lawful retention and deletion, third-party processor details, analytics consent, refund terms and the meaning of the non-expiring course promise need proper product/legal implementation before public release. Existing policy pages are templates.

**DevOps/security:** Current Git SHA deployed, Neon production migration state, live Auth0 session behavior, Docker/CI pass status, provider credentials, Cloudflare CDN caching and backups are unverified by source ZIP alone. Keep regular tests lightweight but conduct targeted DB/security/gateway/recovery integration testing before risky releases.

**No automatic background commitments:** Chat 03 can inspect and propose. It must not silently run migrations, push to a deploying branch or make provider/service changes without task-specific authorization.

## 15. Decision-implementation evidence matrix and release gates

| Domain               | Approved contract                           | Implemented in latest inspected app?                                | Minimum evidence before relevant release                                                         |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| User/UUIDv7/Auth0    | ADR-001/004, ERD-13/36/38                   | **Partial foundation:** Auth0 User and `uuidv7()` migration present | Auth0 session/sync test, current migrations/IDs preserved                                        |
| API versioning       | IMP-17 / ADR-065                            | **No** for 3 custom existing routes                                 | Owned endpoint/caller/probe inventory; versioned routes pass end-to-end; no legacy owned routes  |
| Academic core        | ADR-007/008, ERD-01–05                      | **No**                                                              | Prisma/SQL validations, ordering/taxonomy integrity, protected course lifecycle                  |
| Lesson and classroom | ADR-003/014–020, ERD-06–12, UX-01–08/21–24  | **No academic implementation evidence**                             | Public/locked payload isolation, progress, text/video, responsive flow                           |
| Enrollment/access    | ADR-023/053/058, ERD-14/18/29–33, IMP-08–10 | **No**                                                              | Free Enroll, durable lifetime access, protected course/material deletion, denial tests           |
| Cashfree and invoice | ADR-005/021/024–026/048, ERD-15–19, IMP-12  | **No**                                                              | Verified provider events, immutable course/financial snapshots, retries, refund, invoice privacy |
| Solved Questions CMS | ADR-010/013/031/038, ERD-09–12/44, UX-46–73 | **No**                                                              | Revision-safe CMS, reuse/context access, feature limit, authorized direct links                  |
| Private doubts       | ADR-009/030/032/042/043, ERD-22–23, IMP-13  | **No**                                                              | Enrollment/educator scope, five/one PDF limits, edits/replies, retryable privacy-safe notices    |
| Editorial/SEO        | ADR-011, ERD-47 and conceptual map          | **Limited public pages only**                                       | Approved article UX, SEO, controlled publication/media/CTA behavior                              |
| Legal policy         | ADR-067                                     | **Templates exist, not approved**                                   | Full accurately drafted policies and proper review before launch                                 |
| Operations/backups   | ADR-049–052, ERD-37, IMP-15–16              | **Source config, not live proof**                                   | Tested migrations, recovery, safe caching, telemetry and access boundaries                       |

### 15.1 Phase 00 proposed completion evidence

- Current repository revision and deployed environment discrepancy inventory; preserve existing code, Auth0 User and migrations.
- All Skyinnk-owned HTTP API paths classified; move to `/api/v1/` only as an approved implementation task with all callers/probes/tests updated.
- Prisma **6.19.3** `validate` and Client generation against revised candidate; do not silently upgrade Prisma/replace migrations.
- Targeted isolated PostgreSQL **18** SQL install + integrity + concurrency + negative-case tests for actual triggers, snapshots, paid fulfillment and deletion protections.
- Separate business-policy/provider validation, backup/restore, Auth0 and SSR/edge cache verification before corresponding public/paid launch.
- Document exact passed/failed/not-run results; a static 66-model count or clean ZIP checksum does **not** establish operational correctness.

### 15.2 Development coordination and change control

1. Chat 01 establishes/approves architecture and records supersessions in this single ADL; Chat 02 supplies approved UX and front-end behavior; Chat 03 audits/develops backend/database/API only under scoped task approval.
2. Maintain an implementation diff/review of the latest source before modifying it. The standalone candidate Prisma schema **must not overwrite** the existing single-User schema wholesale.
3. Introduce foundational safety constraints alongside the first real enrollments, protected media, published CMS and paid transactions; do not postpone necessary protections until after collecting learner money/data.
4. Keep routine CI proportionate and lightweight; separate targeted disposable database, security, payment and recovery checks from routine tests as previously approved.
5. Reconcile each implementation handoff with the current **source ZIP, current ADL and Chat 02 UX handoff**. The old ADLs are obsolete; the UX handoff is supplementary, not a replacement decision log.
6. No assistant-produced planning document, schema review package or Codex prompt is permission to change production; explicit approval precedes migrations/deployment.

## 16. Source traceability and document change history

### 16.1 Evidence and priority order

1. **Authoritative ADL base supplied now:** `ARCHITECTURE-DECISIONS(1).md`, SHA-256 `490c892c6d31381291e00011b667848702397bc47185a19cef261d9ad980e1cc` — source of **ADR-001–053** and original V1.2 conceptual relationship map. Only this uploaded ADL was used as the _document baseline_. All older ADL versions are obsolete.
2. **Explicit later Chat 01 user approvals in this conversation:** Discussions 08–14 (ERD-01–54), course-delete special ERD-29, UUIDv7 ERD-38, Discussions 18–19 (IMP-01–16), and final IMP-17 clarification. These take precedence over older “still open” statements.
3. **UX supplementary evidence (not an ADL):** `Skyinnk-Chat01-Verified-Handoff(1).zip`, three files (`01-Chat01-Master-Architecture-Handoff.md`, `02-Solved-Questions-Architecture-Annex.md`, `03-Archive-Audit-and-Reconciliation.md`). The last provides numbered source-path provenance for UX-01–73. The original numbered UX archive was not independently re-read in this turn.
4. **Current application-source evidence (not an ADL):** `skyinnk-copy(1).zip`, SHA-256 `d9729ff87676a4422d81528ff76c39f0b32cdaa26ac8b610c4fb78dcb9304356`, and prior read-only source audit. Code snapshot is not current production evidence.
5. **Current candidate schema (not an ADL or live schema):** `Skyinnk-Schema-Repair-V4-Reviewed.zip`, SHA-256 `b2afeaba500d1ca298f2da5f393f456fbb5377103882d10772f99ca44fb19825`. Reported static-check results do not certify execution.

### 16.2 Supersession rules to enforce when distributing this file

- **Canonical ADL filename:** `docs/architecture/ARCHITECTURE-DECISIONS.md` when the user authorizes repository insertion. This generated artifact is the single updated master; do not rely on the earlier v2.0 or any exported v1.x ADL.
- **Historical ADR interpretation:** The original ADR-001–053 section remains intact for audit. Later approved ERD/IMP decisions **resolve** older open questions without erasing their original wording. The original v1.2 “Still open” list is reproduced solely as an obsolete historical appendix below, **not current blockers**.
- **Proposals separated:** ERD-55–65 and IMP-18–25 are not to be copied into an “approved” status column without a fresh explicit approval. The user requested fixing review artifacts, not blanket production authorization.
- **UX source interpretation:** The 73-entry summary is the _verified handoff's reconciliation_, not a false claim of personally opening 73 primary Markdown files today. If exact quotations or changes of nuance matter, check the original UX archive in Chat 02.

### 16.3 Master document history

| Version               | Date            | Status / content                                                                                                                                                                                                                                                                                                               |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0–1.1               | 10 Nov 2026     | Prior historical draft approvals referenced in the user's uploaded original; **obsolete as separate ADL files**.                                                                                                                                                                                                               |
| **1.2**               | 10 Nov 2026     | **User-uploaded authoritative baseline** here; ADR-001–053 and conceptual relationship map; original fully retained in this updated edition.                                                                                                                                                                                   |
| 2.0                   | 11 Nov 2026     | Earlier assistant-generated partial consolidation; **obsolete** and **not used as the baseline** for this edition.                                                                                                                                                                                                             |
| **3.0 — full master** | **11 Nov 2026** | **Current sole ADL:** preserves original ADR-001–053, adds ADR-054–068, registers every approved ERD-01–54 and IMP-01–17, includes all 73 UX discussion decisions via verified handoff, source/supersession/approval evidence, candidate-only ERD-55–65 and proposed IMP-18–25, source-vs-schema distinction and launch gates. |

### 16.4 Historical note on the original v1.2 open list

The following exact historical sections came from the user-uploaded version 1.2. They are reproduced for provenance **only**. Many listed questions were subsequently settled by ERD-01–54 or IMP-01–17, and the original “next architecture phase” statement is no longer current. For action items, use §14 and §15 above.

```markdown
## 7. Still open before code / migrations

- Exact Prisma model names, field definitions, enum values, UUID default choices, constraints, indexes and deletion rules.
- Whether category/subject primary designation is mandatory at publish time and how the “at most one primary” rule is enforced.
- Topic/subtopic hierarchy depth and how curriculum-specific concept variants are distinguished.
- Final resource/asset modeling, provider abstraction, private files and premium video delivery (ADR-016/017).
- Whether direct Course ↔ Solved Question associations are required in addition to lesson associations.
- Whether `Enrollment` alone is the authoritative entitlement or `AccessGrant` is needed for richer scenarios.
- Formal free-preview, registered-free, paid, educator and administrator authorization matrix.
- Cashfree API/webhook/refund/idempotency schema, operational readiness and release gate.
- Exact private doubt/attachment retention, moderation and minor-related safeguards.
- Article publication workflow, course/topic links, SEO fields and editorial administration.
- Exact integration of the **approved V1 Markdown CMS** into lessons and any other content workflows, safe rendering, author permissions and revision semantics (ADR-013/015).
- Course/module/lesson lifecycle state transitions and authenticated preview behavior (ADR-018/019/020).
- Invoice numbering, taxation, immutable snapshots, PDF retrieval authorization, refund/correction policy and Cashfree reconciliation (ADR-021).
- Versioned milestone plan, acceptance tests, migration rollback/recovery, production release procedure.

**Next architecture phase:** Consolidated domain ERD and detailed Prisma schema proposal, including permission matrix, CMS publication contracts, media and Cashfree/invoice records, followed by staged implementation planning and verification. Discussions 04–07 are approved at the principle level; implementation contracts remain open. Nothing in this log authorizes deployment.

## 8. Decision change procedure

When a new decision is made in HQ:

1. Assign the next ADR ID (or revise an existing ADR with an explicit supersession note).
2. Record the user-approved decision, rationale, scope, and any unresolved technical details.
3. Update the version and date and distribute the revised document to relevant specialist chats.
4. Implement only against approved technical contracts; report actual tests and production evidence separately.

### Change history

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                  |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-11-10 | First consolidated master log; incorporates confirmed architecture principles, the resolved five issues, and the user's explicit approval of conceptual V1.2 domain relationships.                                                                                                                                      |
| 1.1     | 2026-11-10 | Recorded explicit approval of all seven Discussion 03 lesson/resource/publication principles (ADR-014–020); corrected the Markdown educator CMS as already approved/in-scope V1 (ADR-013); preserved paid-course invoices as V1 (ADR-021); advanced next discussion to identity, enrollment, entitlements and Cashfree. |
| 1.2     | 2026-11-10 | Added ADR-022–053 covering user-approved Discussions 04, 05, corrected 06 and 07. All earlier ADRs and V1.2 conceptual relationships preserved.                                                                                                                                                                         |
```
