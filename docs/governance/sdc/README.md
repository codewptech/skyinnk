# Skyinnk Development Cycle (SDC) — V1 Chat Management

Status: **proposed for independent PR review / not yet integrated**. Supersedes experimental daily/hourly-as-throughput assumptions: the final target is **near-continuous event-driven work**, with native schedule only as an optional recovery fallback; full execution remains unverified until Issue #59 passes. This is a **chat-management operating layer**, not PEA-2 and not an amendment to approved V1 product scope.

## Documents
- [Operating contract](OPERATING-CONTRACT.md) — six fresh chat identities, one global V1 roadmap, queue priorities, review modes and evidence standards.
- [Six copy-ready bootstrap prompts](CHAT-BOOTSTRAP-PROMPTS.md) — use in six **new conversations**, not old chats.
- [Global milestone registry](GLOBAL-V1-MILESTONES.md) — an initial factual inventory and the canonical record template.
- [Legacy Review Box](REVIEW-BOX.md) — chat/PR triage and non-destructive cleanup rules.

## First-use order
1. Do not delete historical conversations. Review Box them; preserve unique decisions and work.
2. Review/merge this documentation PR through protected development, if acceptable. Until integration, its branch is an auditable proposal.
3. Create six NEW named role sessions with designated modes: **01 ChatGPT Chat; 02/03 ChatGPT Work; 04/05/06 Codex.** Codex tasks/sessions need not appear as ordinary ChatGPT chats. Paste the corresponding standalone prompt and confirm usable GitHub access. If mode is unavailable, record MODE BLOCKED in Review Box; do not claim that agent is running.
4. Start the independent Review Director with a read-only current-repo baseline. This must not rewrite or merge existing code.
5. Use existing **V1-58 / GitHub Issue #58** as the first canonical global V1 milestone. SDC 03 alone creates further global outcome issues and uses their GitHub issue number as ID, after duplicate checks.
6. Launch actual supported engineering sessions. A GitHub issue can queue work, but cannot wake a dormant chat.
7. Review Director routes findings to GitHub queues; engineers finish their **current commitment first**, then queued mandatory Reviewer corrections, then next eligible new global milestone.
8. Owner may examine ANY available identified revision on their laptop at ANY time. Human review is not a routine gating dependency.
9. SDC 06 coordinates only reviewed, authorized non-production integration within exact existing approval scope. **Owner alone authorizes production release.** Code progression must not wait for an arbitrary hourly/daily schedule; event-to-agent execution still requires runtime evidence.

**Coordination mailbox:** GitHub issues/PRs, canonical global milestone records and current development SHA. Conversation memory is not authoritative.
