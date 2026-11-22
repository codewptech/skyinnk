#!/usr/bin/env node
// Offline, read-only evidence consistency verifier. Never starts an agent or authenticates a remote run.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SHA = /^[0-9a-f]{40}$/i;
const ROLES = new Set(['SDC 01', 'SDC 02', 'SDC 03', 'SDC 04', 'SDC 05', 'SDC 06']);
const OPERATIONS = new Set(['ENGINEERING_TASK', 'INDEPENDENT_REVIEW', 'INTEGRATION_GATE', 'MILESTONE_REAUDIT']);
const KINDS = new Set(['ASSIGNED', 'ACKNOWLEDGED', 'RUNNING', 'HEARTBEAT', 'COMPLETED', 'REVIEW_PENDING', 'REVIEWED', 'INTEGRATION_PENDING', 'INTEGRATED', 'VERIFIED', 'BLOCKED', 'EXPIRED', 'RETRY_ELIGIBLE', 'ESCALATED']);
const TRANSITIONS = {
  ELIGIBLE: new Set(['ASSIGNED']),
  ASSIGNED: new Set(['ACKNOWLEDGED', 'BLOCKED', 'EXPIRED']),
  ACKNOWLEDGED: new Set(['RUNNING', 'BLOCKED', 'EXPIRED']),
  RUNNING: new Set(['HEARTBEAT', 'COMPLETED', 'BLOCKED', 'EXPIRED']),
  COMPLETED: new Set(['REVIEW_PENDING', 'BLOCKED']),
  REVIEW_PENDING: new Set(['REVIEWED', 'BLOCKED']),
  REVIEWED: new Set(['INTEGRATION_PENDING', 'BLOCKED']),
  INTEGRATION_PENDING: new Set(['INTEGRATED', 'BLOCKED']),
  INTEGRATED: new Set(['VERIFIED', 'BLOCKED']),
  VERIFIED: new Set(),
  BLOCKED: new Set(['ESCALATED']),
  EXPIRED: new Set(['RETRY_ELIGIBLE', 'ESCALATED']),
  RETRY_ELIGIBLE: new Set(['ACKNOWLEDGED', 'BLOCKED', 'ESCALATED']),
  ESCALATED: new Set(),
};
const need = (ok, message) => { if (!ok) throw new Error(message); };
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const sha = x => typeof x === 'string' && SHA.test(x);
const instant = (value, label) => {
  need(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value), `${label}: UTC ISO timestamp required`);
  const ms = Date.parse(value);
  need(Number.isFinite(ms), `${label}: invalid timestamp`);
  return ms;
};

/** Identity is stable across observations, but each execution attempt must carry a *real* distinct run ID. */
export function assignmentId(a) {
  need(a && typeof a === 'object', 'assignment required');
  need(/^[\w.-]+\/[\w.-]+$/.test(a.repository || ''), 'invalid repository');
  need(Number.isSafeInteger(a.milestone) && a.milestone > 0, 'invalid milestone');
  need(ROLES.has(a.role), 'unrecognized SDC role');
  need(Number.isSafeInteger(a.taskIssue) && a.taskIssue > 0, 'invalid PEA-2 issue');
  need(OPERATIONS.has(a.operation), 'invalid operation');
  need(sha(a.sourceSha), 'exact 40-character source revision required');
  const canonical = ['sdc-runtime-assignment-v1', a.repository.toLowerCase(), a.milestone, a.role,
    a.taskIssue, a.operation, a.sourceSha.toLowerCase()].join('\n');
  return `sdc-a1-${createHash('sha256').update(canonical).digest('hex')}`;
}

function source(e, expected) {
  need(e.source && e.source.kind === expected && nonempty(e.source.reference),
    `${e.kind}: ${expected} source with nonempty reference required`);
}
function productReceipt(e, current, assignment) {
  source(e, 'product_execution');
  const r = e.receipt;
  need(r && nonempty(r.provider) && nonempty(r.runId) && nonempty(r.sessionId) &&
    nonempty(r.actorId) && nonempty(r.receiptId) && nonempty(r.productRecordReference),
    `${e.kind}: genuine product run/session/actor/receipt references required; GitHub comments cannot substitute`);
  need(e.attemptId && nonempty(e.attemptId), `${e.kind}: execution attempt ID required`);
  need(r.role === assignment.role && r.sourceSha?.toLowerCase() === assignment.sourceSha.toLowerCase(),
    `${e.kind}: role or source revision mismatch`);
  if (current) {
    need(e.attemptId === current.attemptId, `${e.kind}: attempt mismatch or replay`);
    for (const key of ['provider', 'runId', 'sessionId', 'actorId'])
      need(r[key] === current[key], `${e.kind}: ${key} mismatch`);
  }
  return { attemptId: e.attemptId, provider: r.provider, runId: r.runId,
    sessionId: r.sessionId, actorId: r.actorId };
}
function ci(check, head, label) {
  need(check && check.name === 'Development CI' && check.conclusion === 'success' &&
    check.latest === true && sha(check.headSha) && check.headSha.toLowerCase() === head.toLowerCase() &&
    nonempty(check.runId) && nonempty(check.reference),
    `${label}: latest successful exact-head Development CI evidence required`);
}
function validateReview(e, pr, executor) {
  source(e, 'github_review');
  const r = e.review;
  need(r && r.state === 'APPROVED' && r.independent === true && nonempty(r.reviewId) &&
    nonempty(r.reviewerActorId) && sha(r.headSha) && r.headSha.toLowerCase() === pr.headSha.toLowerCase(),
    'REVIEWED: independent native APPROVED review at exact PR head required; COMMENTED is inconclusive');
  need(r.reviewerActorId !== executor.actorId && r.reviewerActorId !== pr.authorActorId,
    'REVIEWED: self-authored or same-executor review prohibited');
  ci(e.ci, pr.headSha, 'REVIEWED');
}

/**
 * Verify internal consistency of externally supplied JSON evidence WITHOUT authenticating its sources.
 * Output is always SIMULATED or UNVERIFIED — never a claim of unattended execution.
 */
export function verify(input) {
  need(input && input.schemaVersion === 1, 'schemaVersion 1 required');
  need(input.mode === 'SIMULATED' || input.mode === 'OBSERVED', 'mode must be SIMULATED or OBSERVED');
  const a = input.assignment;
  const id = assignmentId(a);
  need(Array.isArray(input.events) && input.events.length > 0, 'events required');
  const observedAt = instant(input.observedAt, 'observedAt');
  const maxIdleMs = input.maxIdleMs ?? 15 * 60_000;
  need(Number.isSafeInteger(maxIdleMs) && maxIdleMs >= 1000 && maxIdleMs <= 86_400_000,
    'maxIdleMs must be 1 second to 24 hours');
  let state = 'ELIGIBLE', lastTime = -Infinity, lastActive = null, executor = null, pr = null, merge = null;
  let activeAttempt = null;
  const seenEventIds = new Set(), seenReceiptIds = new Set(), usedAttempts = new Set(), usedRuns = new Set();
  const history = [];
  for (const e of input.events) {
    need(e && nonempty(e.id) && KINDS.has(e.kind), 'event ID and known kind required');
    need(!seenEventIds.has(e.id), `duplicate/replayed event ID ${e.id}`);
    seenEventIds.add(e.id);
    need(e.assignmentId === id, `${e.kind}: assignment ID or source revision mismatch`);
    const at = instant(e.at, `${e.kind}.at`);
    need(at > lastTime && at <= observedAt, `${e.kind}: out-of-order or future event`);
    // Timeouts must be checked at each transition, not only at final observation.
    if (!['EXPIRED', 'BLOCKED'].includes(e.kind)) {
      if (state === 'ASSIGNED')
        need(at - lastTimeBefore(history) <= maxIdleMs,
          `${e.kind}: prior assignment ACK timed out`);
      if (['ACKNOWLEDGED', 'RUNNING'].includes(state))
        need(lastActive !== null && at - lastActive <= maxIdleMs,
          `${e.kind}: prior product heartbeat/ACK expired`);
    }
    lastTime = at;
    if (e.kind === 'HEARTBEAT') {
      need(state === 'RUNNING', 'HEARTBEAT: only valid for RUNNING task');
    } else {
      need(TRANSITIONS[state].has(e.kind), `invalid lifecycle transition ${state} -> ${e.kind}`);
    }
    if (e.kind === 'ASSIGNED') {
      source(e, 'routing');
      need(!e.receipt && !e.attemptId, 'ASSIGNED is not an authenticated run');
    } else if (e.kind === 'ACKNOWLEDGED') {
      const next = productReceipt(e, null, a);
      need(!usedAttempts.has(next.attemptId), 'replayed attempt ID');
      need(!usedRuns.has(`${next.provider}\u0000${next.runId}`), 'replayed product run ID');
      usedAttempts.add(next.attemptId);
      usedRuns.add(`${next.provider}\u0000${next.runId}`);
      need(!seenReceiptIds.has(e.receipt.receiptId), 'duplicate/replayed product receipt ID');
      seenReceiptIds.add(e.receipt.receiptId);
      activeAttempt = next; executor = next; lastActive = at;
    } else if (['RUNNING', 'HEARTBEAT', 'COMPLETED'].includes(e.kind)) {
      productReceipt(e, activeAttempt, a);
      need(!seenReceiptIds.has(e.receipt.receiptId), 'duplicate/replayed product receipt ID');
      seenReceiptIds.add(e.receipt.receiptId);
      if (e.kind === 'COMPLETED') {
        need(e.pr && Number.isSafeInteger(e.pr.number) && e.pr.number > 0 && sha(e.pr.headSha) &&
          nonempty(e.pr.authorActorId) && nonempty(e.pr.reference),
          'COMPLETED: PR number, head, author and GitHub reference required');
        need(e.pr.headSha.toLowerCase() !== a.sourceSha.toLowerCase(),
          'COMPLETED: task PR head cannot equal unchanged base source revision');
        pr = e.pr;
      }
      lastActive = at;
    } else if (e.kind === 'REVIEW_PENDING') {
      source(e, 'github_pr');
      need(pr && e.prNumber === pr.number && e.headSha === pr.headSha,
        'REVIEW_PENDING: stale PR head');
    } else if (e.kind === 'REVIEWED') {
      validateReview(e, pr, executor);
    } else if (e.kind === 'INTEGRATION_PENDING') {
      source(e, 'github_pr');
      need(e.expectedHeadSha === pr?.headSha, 'INTEGRATION_PENDING: stale reviewed PR head');
      ci(e.ci, pr.headSha, 'INTEGRATION_PENDING');
    } else if (e.kind === 'INTEGRATED') {
      source(e, 'github_merge');
      const m = e.merge;
      need(m && m.protected === true && nonempty(m.authorizationReference) &&
        sha(m.mergeCommitSha) && sha(m.developmentBeforeSha) &&
        m.expectedHeadSha === pr?.headSha && m.mergeCommitSha !== m.developmentBeforeSha &&
        ['squash', 'merge', 'rebase'].includes(m.method),
        'INTEGRATED: authorized protected exact-head merge evidence required');
      merge = m;
    } else if (e.kind === 'VERIFIED') {
      source(e, 'github_ci');
      need(merge, 'VERIFIED: missing merge evidence');
      ci(e.postmergeCi, merge.mergeCommitSha, 'VERIFIED post-merge');
    } else if (e.kind === 'EXPIRED') {
      source(e, 'observation');
      if (state === 'ASSIGNED') need(at - lastTimeBefore(history) >= maxIdleMs,
        'EXPIRED: assignment ACK timeout not demonstrated');
      else need(lastActive !== null && at - lastActive >= maxIdleMs,
        'EXPIRED: missing or insufficient heartbeat timeout');
    } else if (['BLOCKED', 'RETRY_ELIGIBLE', 'ESCALATED'].includes(e.kind)) {
      source(e, 'observation');
      need(nonempty(e.reason), `${e.kind}: concrete reason required`);
      if (e.kind === 'RETRY_ELIGIBLE') {
        activeAttempt = null;
        lastActive = null;
      }
    }
    if (e.kind !== 'HEARTBEAT') state = e.kind;
    history.push({kind:e.kind, at:e.at, eventId:e.id});
  }
  if (state === 'ASSIGNED')
    need(observedAt - Date.parse(history.at(-1).at) <= maxIdleMs,
      'ASSIGNED: missing or expired authenticated ACK; fail closed');
  if (['ACKNOWLEDGED', 'RUNNING'].includes(state))
    need(lastActive !== null && observedAt - lastActive <= maxIdleMs,
      `${state}: missing or expired ACK/heartbeat; fail closed`);
  return {
    schemaVersion: 1, assignmentId: id, controllerIdempotencyKey: a.controllerIdempotencyKey || null,
    state, eventsValidated: history.length, history,
    attemptCount: usedAttempts.size, distinctRunCount: usedRuns.size,
    evidenceAssessment: input.mode === 'SIMULATED' ? 'SIMULATED_ONLY' : 'CONSISTENT_BUT_UNAUTHENTICATED_OFFLINE',
    unattendedExecutionProven: false,
    sourceIdentityAuthenticated: false,
    limitation: 'Offline JSON and its asserted source metadata cannot independently authenticate a Work/Codex executor, a GitHub actor, or an unattended trigger.',
  };
}
function lastTimeBefore(history) { return history.length ? Date.parse(history.at(-1).at) : -Infinity; }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    need(process.argv.length === 3, 'Usage: node scripts/sdc-runtime-receipts.mjs <fixture.json>');
    const fixture = JSON.parse(await readFile(process.argv[2], 'utf8'));
    process.stdout.write(JSON.stringify(verify(fixture), null, 2) + '\n');
  } catch (err) {
    process.stderr.write(`SDC receipt verification blocked: ${err.message}\n`);
    process.exitCode = 1;
  }
}
