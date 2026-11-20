# SDC V1 — Legacy Conversations & Repository Review Box

**Status:** Safety-first triage inventory as of 2026-11-20. This is not a complete export of the user's ChatGPT conversation sidebar. Repository tooling CANNOT list or delete personal chat threads; names below come from known project context. **ALL 6 SDC roles require NEW chats.** Do not repurpose an old one.

## Labels and deletion policy
- **NEW**: create a fresh conversation with respective [bootstrap prompt](CHAT-BOOTSTRAP-PROMPTS.md).
- **REFERENCE / REVIEW BOX**: preserve until valuable unpublished decisions, findings, files and pending handoffs are checked against GitHub and new SDC contract.
- **ARCHIVE CANDIDATE**: after exact handoff and duplicate verification, user can archive for UI cleanliness. Archiving is NOT deletion; archived chats may still contain unique knowledge.
- **SAFE TO DELETE**: only after the user confirms a chat has no unique decision, file, attachment, credential, active work or unresolved change, that contents are preserved elsewhere and that deletion is actually desired. **Zero legacy conversations currently certified safe to delete.** Deletion is irreversible in the product and is NOT requested/performed by the SDC automation.

## Six NEW role chats to create
1. `SDC 01 — Architecture Authority`
2. `SDC 02 — Experience Engineer & Architect`
3. `SDC 03 — Independent Review Director`
4. `SDC 04 — Systems Engineer`
5. `SDC 05 — Repair & Refactoring Engineer`
6. `SDC 06 — Integration & Build Engineer`

## Known legacy Skyinnk chats — place into REVIEW BOX (do not delete now)
These are **known names/roles from supplied project conversation context**, not a verified complete chat list.

| Historical conversation | Why preserve for review | Potential new destination |
|---|---|---|
| `01-Platform Architecture HQ` / platform architecture discussion | Unique ADR, schema, V1 scope and release/business decisions may only be in history | New SDC 01, and links in global V1 registry |
| `02-UI/UX Design & Frontend Dev` | Frozen UX discussions and exact lesson/classroom design decisions, Solved Questions handoffs | New SDC 02; later architecture signoff if needed |
| `Technical Baseline Review` / legacy Chat 03 | Source status, Prisma migrations, API versioning, test outcomes and unmerged handoffs | New SDC 04 and 06 |
| `V1 Launch Implementation Update` | Existing frontend source, PR handoffs and browser/real content limitations | New SDC 02 and 03 |
| `skyinnk-backEnd` | Legacy Auth0/Nuxt/Neon technical history; potential infrastructure decisions | New SDC 04 |
| `Skyinnk project-HQ` | Original product intent, teaching experience and long-form user requirements | New SDC 01 and 03 |
| `PR Merge Update` and PEA-2 coordination conversations | Exact reviews, merged heads, issue context and governance boundaries | New SDC 03 and 06; GitHub remains source of truth |
| This SDC design/approval discussion | Original v1, v1.1 and revised global-milestone chat architecture; six fresh-role mandate | All six new chats via approved SDC PR |

If two items above turn out to be aliases for the same thread, classify once. If older messages, chat folders, screenshots, source ZIPs or handovers are discovered beyond this inventory, add them to Review Box before any cleanup decision.

### Recommended cleanup of the old sidebar
1. **Do not delete anything now.** Create six brand-new SDC chats first.
2. Keep these legacy Skyinnk chats as read-only reference; mark them `REVIEW BOX — LEGACY` via title if convenient.
3. For each, compare unique approved decisions, files, owner instructions and unfinished tasks with repository source and current new-chat instructions.
4. Move durable missing context to approved GitHub documentation or the appropriate linked issue; link the exact original chat if users can supply it.
5. After user verifies completeness, mark `ARCHIVE CANDIDATE` and optionally archive manually. Do not tell the owner deletion is safe solely because a GitHub PR was merged.
6. Any ambiguous/unreadable chat remains REVIEW BOX indefinitely until verified.

## Existing GitHub backlog — independent of chat deletion
**The following are repository resources, not disposable chats. Keep their history.** Each needs exact-head/source and owner-authorization reconciliation before any integration.

| PR | Context | SDC triage |
|---|---|---|
| #43 | PEA-2 continuity record | SDC 01/03 review; avoid overlapping current governance edits |
| #40 | Read-only review conveyor prototype | SDC 03/06 review; optional integration after compatibility |
| #41 | CAS claim prototype | Review Box; NOT activated, owner permissions and real executor absent |
| #30 | V1 release record | SDC 06 verification, technical documentation owner |
| #28 | Local recovery rehearsal and release authorization proposal | Review Box; NO live production action |
| #26 | Hosted App standby source | **Quarantine** under rejected App/hosting decision, do not activate |
| #20 | Classroom accessibility | SDC 02/05 remediation review, then independent source check |
| #18 | Resource-byte/content validation | SDC 04/05 cross-layer source review |
| #16 | Auth0 profile freshness | SDC 04/05 security/source review |
| #14 | First publication test | SDC 02/05/06 source and CI compatibility review |

Other open issues remain valid historical tasks. Issue #35 (frontend course discovery) and #36 (public API runtime acceptance) are future work inputs to one **global V1 milestone**, not two separately numbered milestones. Issue #39's concurrency pilot is NOT complete until real simultaneous supported runtimes are evidenced. Issue #7's hosted trusted governance is rejected/optionally historical, not a new operational dependency.

## Rules for the Review Director
- Do not mass-close, delete, rename or merge old issues/PRs while making a clean chat structure.
- Preserve a distinction between `reviewed source`, `open PR`, `merged`, `post-merge CI`, `technically verified` and `owner accepted`.
- Unknown legacy chat? Put it in Review Box automatically; no guesses about “safe delete”.
- No activity claim for a dormant conversation; requires a supported live execution session.
