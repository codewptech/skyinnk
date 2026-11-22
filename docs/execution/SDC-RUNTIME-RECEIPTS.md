# Skyinnk SDC Runtime Receipt Verifier — Offline v1

**Authority:** [Issue #84](https://github.com/codewptech/skyinnk/issues/84), linked to the permanent-runtime acceptance [Issue #59](https://github.com/codewptech/skyinnk/issues/59). This is a read-only, three-new-file technical evidence checker. It is **not** an engineering dispatcher, an authenticated session provider, a claim broker, or a new controller.

## Use

```bash
node --test tests/sdc-runtime-receipts.test.mjs
node scripts/sdc-runtime-receipts.mjs path/to/evidence-fixture.json
```

The CLI reads one local JSON file and prints deterministic JSON or a blocking error. It writes no files, makes no network requests, starts no Work/Codex tasks, and does not modify GitHub. Import `assignmentId(assignment)` to derive the versioned task identity and `verify(fixture)` to check one task lifecycle. The test suite demonstrates **two separately simulated** complete cycles and negative cases; no test is evidence of an actual unattended task.

## Fixture contract

```json
{
  "schemaVersion": 1,
  "mode": "SIMULATED",
  "observedAt": "2026-11-22T12:10:00.000Z",
  "maxIdleMs": 900000,
  "assignment": {
    "repository": "codewptech/skyinnk",
    "milestone": 58,
    "role": "SDC 04",
    "taskIssue": 84,
    "operation": "ENGINEERING_TASK",
    "sourceSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "controllerIdempotencyKey": "SDC 04:ELIGIBLE_TASK:84:0:none"
  },
  "events": [
    {
      "id": "route-1",
      "kind": "ASSIGNED",
      "at": "2026-11-22T12:00:00.000Z",
      "assignmentId": "sdc-a1-<derive using assignmentId(...)>",
      "source": {"kind": "routing", "reference": "https://github.com/..."}
    }
  ]
}
```

Replace the placeholder assignment ID with the computed 64-hex digest. Every event has a unique ID, a strictly increasing UTC timestamp not later than `observedAt`, and the *same* assignment ID. Allowed `mode` values: `SIMULATED` and `OBSERVED`. `OBSERVED` is **not** proof of authentication: input JSON and its assertions can be forged. Output is always `SIMULATED_ONLY` or `CONSISTENT_BUT_UNAUTHENTICATED_OFFLINE`; `unattendedExecutionProven` and `sourceIdentityAuthenticated` are always `false`.

### Stable assignment and compatibility

The verifier's `sdc-a1-<sha256>` identity covers a canonical, newline-separated tuple: version, lowercased repository, global milestone, SDC role, PEA-2 task issue, operation and exact source SHA. It is deterministic for one assignment and changes when its task, role or source SHA changes. The existing controller's `idempotencyKey: [role,kind,issue,pr,head].join(':')` can be attached as `controllerIdempotencyKey` for correlation **without claiming identity equivalence**. For an `ELIGIBLE_TASK` routing packet, the existing controller carries no PR or head SHA, so its actual legacy key ends in `:0:none`; the new versioned verifier separately includes the verified development `sourceSha` in its own stable assignment identity. A copied legacy key is still **advisory metadata only**, never authenticated run evidence. The current controller's `dispatchStatus=BLOCKED_NO_VERIFIED_CHAT_TRIGGER` remains unchanged.

Each execution attempt must supply a distinct actual `attemptId`, and `ACKNOWLEDGED` must have a product execution receipt with `provider`, `runId`, `sessionId`, `actorId`, `receiptId`, `productRecordReference`, assigned `role` and `sourceSha`. Subsequent `RUNNING`, `HEARTBEAT`, and `COMPLETED` receipts must retain that exact role, source revision, attempt, provider, run, session and actor. Every receipt has its own unique `receiptId`. GitHub issues/comments, routing snapshots, action artifacts or CI checks are **not** product run acknowledgements. Replayed attempt IDs, event IDs, receipts and run IDs fail closed.

### Supported lifecycle and source categories

- `ELIGIBLE → ASSIGNED`: `routing` source. Assignment does not prove a run started.
- `ASSIGNED → ACKNOWLEDGED → RUNNING`: `product_execution` sources, correlated actual run/session/actor identity. Repeated `HEARTBEAT` events require fresh unique product receipts.
- `RUNNING → COMPLETED`: product receipt plus PR number, repository, protected-development target, exact PR `headSha` and `baseSha`, author identity and PR link.
- `COMPLETED → REVIEW_PENDING`: `github_pr` source matching the completed PR number, repository, protected-development target and head.
- `REVIEW_PENDING → REVIEWED`: `github_review` source. Requires a native `APPROVED` claim for that same repository, PR number, target and exact head, by a distinct actor; `COMMENTED` is not an approval. Also requires phase-specific candidate `Development CI` provenance.
- `REVIEWED → INTEGRATION_PENDING`: current exact PR head, repository, number and protected-development base must agree, with the latest successful candidate PR CI.
- `INTEGRATION_PENDING → INTEGRATED`: `github_merge` source matching the same repository, PR number, protected-development target, exact PR head and pre-merge development revision. Merge protection, explicit authorization, distinct merge SHA and supported method are required.
- `INTEGRATED → VERIFIED`: `github_ci` source with a matching **development push**, not a candidate pull-request check, at the resulting protected-development merge commit.

### Cross-phase evidence schema and consistency rules

The approved target is exactly `development/v1-public-launch`, not `main` or another repository's branch. GitHub commits can be referenced by multiple PRs, so an identical head SHA is **not sufficient** to establish review or merge identity. All fields below are mandatory for the named stage. Field contents remain **untrusted fixture assertions**; this reducer performs internal consistency checks only.

| Stage | Required identity/provenance fields |
| --- | --- |
| `COMPLETED.pr` | `repository`, integer `number`, `targetBranch`, exact `baseSha`, exact `headSha`, `authorActorId`, `reference`; repository must match assignment and target must be the protected development branch |
| `REVIEW_PENDING` | `repository`, integer `prNumber`, `targetBranch`, exact `headSha`; all match completed PR |
| `REVIEWED.review` | `repository`, integer `prNumber`, `targetBranch`, exact `headSha`, `state: APPROVED`, `independent: true`, `reviewId`, distinct `reviewerActorId`; `COMMENTED` is explicitly insufficient |
| `REVIEWED.ci` and `INTEGRATION_PENDING.ci` | `workflow: Development PR CI`, `name: Development CI`, `event: pull_request`, `repository`, integer `prNumber`, `targetBranch`, `baseRef`, exact `baseSha` and `headSha`, `conclusion: success`, `latest: true`, `runId`, `reference`; CI base must equal the completed PR base, all identity fields must agree |
| `INTEGRATION_PENDING` | Matching `repository`, `prNumber`, `targetBranch`, `expectedHeadSha`, and `currentDevelopmentSha` equal to the completed PR's declared base |
| `INTEGRATED.merge` | Matching `repository`, integer `prNumber`, `targetBranch`, `expectedHeadSha`, `developmentBeforeSha` equal to completed PR base; `protected: true`, nonempty `authorizationReference`, distinct `mergeCommitSha`, one of `squash/merge/rebase` |
| `VERIFIED.postmergeCi` | `workflow: Development PR CI`, `name: Development CI`, `event: push`, `repository`, `targetBranch`, `branch: development/v1-public-launch`, `headSha` equal to the merge commit, `conclusion: success`, `latest: true`, `runId`, `reference` |

A **single GitHub Actions workflow run cannot be both a candidate PR check and a later protected-development push check**. The verifier binds the candidate check's `runId` and `reference` at `REVIEWED`; `INTEGRATION_PENDING` must reuse that exact candidate run identity (it is legitimate to cite the same candidate CI again). The `VERIFIED` post-merge push check must carry a **different** run ID **and** a **different** run reference. Matching event labels alone never make a replayed workflow run distinct. A changed candidate CI run between source review and integration requires a fresh reviewed evidence packet; missing or replayed run identity fails closed.

The `ci()` check deliberately applies **different event and branch/PR rules** to candidate and post-merge checks. A `push` event cannot stand in for PR candidate CI; a `pull_request` event cannot stand in for post-merge development CI. An incorrect or missing PR number, repository, target, CI phase, or development base is rejected even if every SHA and the fixture's `latest` flag otherwise looks correct. A changed development tip requires fresh candidate-base evidence before protected integration.

The automated regression suite now includes the independent reviewer-discovered mismatched-PR and mismatched-target cases, reversed candidate/postmerge event provenance, missing identity fields, cross-repository evidence and stale-base negative controls. **All positive records remain synthetic** and neither a simulated review nor fabricated test run becomes authenticated evidence.

Failure transitions are explicit: `BLOCKED`, `EXPIRED`, `RETRY_ELIGIBLE`, `ESCALATED`. A timed-out acknowledged or running task fails closed unless a valid, chronological expiration and retry with a **new** attempt/run is recorded. The verifier does not retry tasks. `maxIdleMs` is fixture-defined (default 15 minutes); `observedAt` drives deterministic expiry without reading the machine's clock. The JSON fixture must not be used to assert atomic leases or exactly-once dispatch.

### Trust and security boundaries

The verifier validates **relationships and consistency** among asserted records, not their cryptographic authenticity. A malicious JSON fixture could fabricate an `APPROVED` review, `verified` CI, or a product receipt. An authenticated **read-only evidence adapter** would be needed to supply real product-run records and GitHub authenticated review/check/merge records; that adapter is *not implemented or authorized by #84*. A human reviewing referenced URLs is still required. No authenticated Work/Codex actor should be inferred from shared GitHub credentials, a self-authored comment, or unverified `actorId`. Issue comments can preserve durable references but are not atomic locks, and the controller's short-lived GitHub routing artifacts are not durable authenticated run receipts.

The first and second complete positive fixtures in the test suite are intentionally labelled `SIMULATED`. They **do not** satisfy Issue #59. Genuine acceptance of unattended engineering still requires a verified GitHub event → existing eligible Codex role/session activation (or separately authorized equivalent), true execution/run ID, independent review, protected integration, post-merge re-audit, and automatic NEXT without another owner prompt. A supported external wake-up endpoint for an existing dormant cloud Codex conversation has **not** been demonstrated. Codex Goals inside an already active thread are not a GitHub webhook-to-dormant-thread trigger.

## Future adapter handshake (proposal only)

An external, explicitly authorized authenticated source adapter would need to receive a stable assignment ID and current source head; return a product-authenticated session/run receipt with immutable attempt/actor identity; deliver monotonic progress/heartbeat/completion records; expose cancellation/stale-run semantics; and provide verifiable read-only provenance for GitHub review, exact-head CI, protected merge and post-merge CI. Before adding it, re-evaluate cost, permissions, provenance, security and the original six-role PEA-2 contract with the owner. Neither a new hosted dispatcher nor an additional role is authorized by this design.
