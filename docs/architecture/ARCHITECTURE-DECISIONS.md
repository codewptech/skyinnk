# SKYINNK — Architecture Decision Log

**Project:** Skyinnk.in  
**Owner conversation:** Chat 01 — Platform Architecture HQ  
**Document version:** 1.2  
**Last updated:** 10 November 2026  
**Status:** Active decision record; Discussions 03–07 approved at principle/UX scope level, implementation specifications and production verification pending

> **Purpose.** Preserve architecture decisions across Chat 01 and specialist chats. This Markdown file is the durable record to store in the project repository (suggested path: `docs/architecture/ARCHITECTURE-DECISIONS.md`). ChatGPT memory is supplementary; code and production status must be separately verified.
>
> **Important:** Approval of a conceptual relationship, feature direction, or UX contract does **not** approve a specific Prisma schema, migration, API, code change, or deployment.

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

## 4. Approved conceptual relationship map — V1.2

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
