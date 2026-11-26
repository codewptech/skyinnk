import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentId, verify } from '../scripts/sdc-runtime-receipts.mjs';

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40);
const repo = 'codewptech/skyinnk';
const target = 'development/v1-public-launch';
const time = i => new Date(Date.UTC(2026, 10, 22, 0, i, 0)).toISOString();
function fixture(taskIssue=84) {
  const assignment = {repository:repo,milestone:58,role:'SDC 04',taskIssue,
    operation:'ENGINEERING_TASK',sourceSha:A,controllerIdempotencyKey:`SDC 04:ELIGIBLE_TASK:${taskIssue}:0:none`};
  const id = assignmentId(assignment);
  const receipt = (n) => ({provider:'Codex',runId:'synthetic-product-run-001',sessionId:'sdc04-original-thread',
    actorId:'engineering-actor',receiptId:`product-record-${n}`,productRecordReference:`https://example.test/codex/${n}`,
    role:'SDC 04',sourceSha:A});
  const assigned = {id:'event-1',kind:'ASSIGNED',at:time(1),assignmentId:id,
    source:{kind:'routing',reference:'https://example.test/github/queue/84'}};
  const ack = {id:'event-2',kind:'ACKNOWLEDGED',at:time(2),assignmentId:id,attemptId:'attempt-a',
    source:{kind:'product_execution',reference:'https://example.test/product/runs/1'},receipt:receipt(2)};
  const running = {id:'event-3',kind:'RUNNING',at:time(3),assignmentId:id,attemptId:'attempt-a',
    source:{kind:'product_execution',reference:'https://example.test/product/runs/1'},receipt:receipt(3)};
  const completed = {id:'event-4',kind:'COMPLETED',at:time(4),assignmentId:id,attemptId:'attempt-a',
    source:{kind:'product_execution',reference:'https://example.test/product/runs/1'},receipt:receipt(4),
    pr:{number:100+taskIssue,repository:repo,targetBranch:target,baseSha:D,headSha:B,
      authorActorId:'engineering-actor',reference:'https://example.test/github/pr'}};
  const reviewPending = {id:'event-5',kind:'REVIEW_PENDING',at:time(5),assignmentId:id,
    source:{kind:'github_pr',reference:'https://example.test/github/pr'},
    repository:repo,targetBranch:target,prNumber:100+taskIssue,headSha:B};
  const candidateCi = {workflow:'Development PR CI',event:'pull_request',repository:repo,
    prNumber:100+taskIssue,targetBranch:target,baseRef:target,baseSha:D,
    name:'Development CI',headSha:B,conclusion:'success',latest:true,
    runId:'ci-1',reference:'https://example.test/github/ci'};
  const review = {id:'event-6',kind:'REVIEWED',at:time(6),assignmentId:id,
    source:{kind:'github_review',reference:'https://example.test/github/pr/reviews/1'},
    review:{state:'APPROVED',independent:true,reviewId:'review-100',reviewerActorId:'independent-reviewer',
      repository:repo,prNumber:100+taskIssue,targetBranch:target,headSha:B},
    ci:{...candidateCi}};
  const integrationPending = {id:'event-7',kind:'INTEGRATION_PENDING',at:time(7),assignmentId:id,
    source:{kind:'github_pr',reference:'https://example.test/github/pr'},
    repository:repo,prNumber:100+taskIssue,targetBranch:target,
    expectedHeadSha:B,currentDevelopmentSha:D,ci:{...candidateCi}};
  const integrated = {id:'event-8',kind:'INTEGRATED',at:time(8),assignmentId:id,
    source:{kind:'github_merge',reference:'https://example.test/github/pr/merge'},
    merge:{protected:true,authorizationReference:'https://example.test/github/approval',
      repository:repo,prNumber:100+taskIssue,targetBranch:target,
      mergeCommitSha:C,developmentBeforeSha:D,expectedHeadSha:B,method:'squash'}};
  const verified = {id:'event-9',kind:'VERIFIED',at:time(9),assignmentId:id,
    source:{kind:'github_ci',reference:'https://example.test/github/runs/last'},
    postmergeCi:{workflow:'Development PR CI',event:'push',repository:repo,
      targetBranch:target,branch:target,name:'Development CI',headSha:C,
      conclusion:'success',latest:true,runId:'ci-post',reference:'https://example.test/github/runs/post'}};
  return {schemaVersion:1,mode:'SIMULATED',assignment,observedAt:time(10),maxIdleMs:10*60*1000,
    events:[assigned,ack,running,completed,reviewPending,review,integrationPending,integrated,verified]};
}
const fails = (mutate, pattern) => {
  const x = fixture(); mutate(x); assert.throws(()=>verify(x), pattern);
};

test('stable v1 assignment identity includes role/task/revision and preserves old controller id only as metadata', () => {
  const x = fixture(); const a = assignmentId(x.assignment);
  assert.match(a, /^sdc-a1-[0-9a-f]{64}$/);
  assert.equal(assignmentId({...x.assignment}),a);
  assert.notEqual(assignmentId({...x.assignment,sourceSha:B}),a);
  assert.notEqual(assignmentId({...x.assignment,role:'SDC 02'}),a);
  assert.equal(verify(x).controllerIdempotencyKey,x.assignment.controllerIdempotencyKey);
});
test('two complete *simulated* cycles are never evidence of unattended execution', () => {
  for (const n of [84,85]) {
    const v = verify(fixture(n));
    assert.equal(v.state,'VERIFIED');
    assert.equal(v.attemptCount,1);
    assert.equal(v.distinctRunCount,1);
    assert.equal(v.evidenceAssessment,'SIMULATED_ONLY');
    assert.equal(v.unattendedExecutionProven,false);
    assert.equal(v.sourceIdentityAuthenticated,false);
  }
});
test('observed fixture remains unverified even if its metadata claims product authentication', () => {
  const x = fixture(); x.mode='OBSERVED';
  const v=verify(x);
  assert.equal(v.evidenceAssessment,'CONSISTENT_BUT_UNAUTHENTICATED_OFFLINE');
  assert.equal(v.unattendedExecutionProven,false);
});
test('reject invalid assignment roles and unknown sha',()=>{
  const x=fixture(); assert.throws(()=>assignmentId({...x.assignment,role:'Steward'}),/unrecognized/);
  assert.throws(()=>assignmentId({...x.assignment,sourceSha:'unknown'}),/source revision/);
});
test('reject missing run ID — no fabricated start',()=>fails(x=>{delete x.events[1].receipt.runId;},/genuine product/));
test('reject GitHub comment used as executor ACK',()=>fails(x=>{x.events[1].source.kind='github_comment';},/product_execution source/));
test('reject unverifiable product source reference',()=>fails(x=>{x.events[1].source.reference='';},/product_execution source/));
test('reject mismatched role',()=>fails(x=>{x.events[2].receipt.role='SDC 03';},/role or source revision/));
test('reject mismatched base revision',()=>fails(x=>{x.events[2].receipt.sourceSha=B;},/role or source revision/));
test('reject mismatched session ID on run heartbeat',()=>fails(x=>{x.events[2].receipt.sessionId='another-session';},/sessionId mismatch/));
test('reject mismatched product run ID',()=>fails(x=>{x.events[2].receipt.runId='different-run';},/runId mismatch/));
test('reject duplicate event IDs',()=>fails(x=>{x.events[3].id=x.events[2].id;},/duplicate\/replayed event/));
test('reject duplicate product receipt IDs',()=>fails(x=>{x.events[2].receipt.receiptId=x.events[1].receipt.receiptId;},/duplicate\/replayed product receipt/));
test('reject out-of-order events',()=>fails(x=>{x.events[2].at=x.events[1].at;},/out-of-order/));
test('reject assignment ID from a different SHA',()=>fails(x=>{x.events[2].assignmentId=assignmentId({...x.assignment,sourceSha:B});},/assignment ID or source revision mismatch/));
test('reject missing ACK and expired assignment',()=>{
  const x=fixture();x.events=x.events.slice(0,1);x.observedAt=time(30);
  assert.throws(()=>verify(x),/missing or expired authenticated ACK/);
});
test('reject expired heartbeat without accepting stale running state',()=>{
  const x=fixture();x.events=x.events.slice(0,3);x.observedAt=time(30);
  assert.throws(()=>verify(x),/missing or expired ACK\/heartbeat/);
});
test('reject stale PR head at review handoff',()=>fails(x=>{x.events[4].headSha=D;},/stale PR head/));
test('reject advisory COMMENTED as independent approval',()=>fails(x=>{x.events[5].review.state='COMMENTED';},/independent native APPROVED/));
test('reject self-authored reviewer',()=>fails(x=>{x.events[5].review.reviewerActorId='engineering-actor';},/self-authored/));
test('reject stale exact-head Development CI',()=>fails(x=>{x.events[5].ci.headSha=A;},/exact-head Development CI/));
test('reject failed latest CI',()=>fails(x=>{x.events[6].ci.conclusion='failure';},/exact-head Development CI/));
test('reject unprotected integration',()=>fails(x=>{x.events[7].merge.protected=false;},/authorized protected/));
test('reject stale integration guard',()=>fails(x=>{x.events[7].merge.expectedHeadSha=A;},/authorized protected/));
test('reject post-merge CI from a different commit',()=>fails(x=>{x.events[8].postmergeCi.headSha=D;},/post-merge.*CI/));
test('reject fake completion without running',()=>fails(x=>{x.events.splice(2,1);},/invalid lifecycle transition/));
test('fail-closed expiry -> retry with NEW attempt and run is consistent but still simulated',()=>{
  const x=fixture();x.events=x.events.slice(0,3);x.observedAt=time(20);
  x.events.push({id:'expired',kind:'EXPIRED',at:time(15),assignmentId:assignmentId(x.assignment),
    source:{kind:'observation',reference:'https://example.test/timeout'}});
  x.events.push({id:'retry',kind:'RETRY_ELIGIBLE',at:time(16),assignmentId:assignmentId(x.assignment),
    source:{kind:'observation',reference:'https://example.test/retry'},reason:'Operator cleared old attempt'});
  const ack=structuredClone(fixture().events[1]);ack.id='new-ack';ack.at=time(17);
  ack.attemptId='attempt-b';ack.receipt.runId='run-new';ack.receipt.receiptId='new-receipt';
  x.events.push(ack);
  const v=verify(x); assert.equal(v.state,'ACKNOWLEDGED');assert.equal(v.attemptCount,2);
  assert.equal(v.unattendedExecutionProven,false);
});
test('duplicate retry attempt is rejected',()=>{
  const x=fixture();x.events=x.events.slice(0,3);x.observedAt=time(20);
  x.events.push({id:'expired',kind:'EXPIRED',at:time(15),assignmentId:assignmentId(x.assignment),
    source:{kind:'observation',reference:'https://example.test/timeout'}});
  x.events.push({id:'retry',kind:'RETRY_ELIGIBLE',at:time(16),assignmentId:assignmentId(x.assignment),
    source:{kind:'observation',reference:'https://example.test/retry'},reason:'timeout'});
  const ack=structuredClone(fixture().events[1]);ack.id='new-ack';ack.at=time(17);ack.receipt.receiptId='new-receipt';
  x.events.push(ack);
  assert.throws(()=>verify(x),/replayed attempt ID/);
});
test('ack without execution run proves nothing, regardless of claimed identity',()=>{
  const x=fixture();x.events=x.events.slice(0,2);x.events[1].receipt.productRecordReference='';
  assert.throws(()=>verify(x),/genuine product run/);
});

// SDC 03 independent exact-head correction findings for PR #85 (22 Nov 2026):
// review/merge PR+repository+target binding and candidate/postmerge CI event provenance.
test('refuse review proof from a different PR using identical commit SHA',()=>
  fails(x=>{x.events[5].review.prNumber+=1;},/repository, PR and protected development target/));
test('refuse review with missing PR number',()=>
  fails(x=>{delete x.events[5].review.prNumber;},/repository, PR and protected development target/));
test('refuse review from another repository at same SHA',()=>
  fails(x=>{x.events[5].review.repository='somewhere/else';},/repository, PR and protected development target/));
test('refuse review without a repository',()=>
  fails(x=>{delete x.events[5].review.repository;},/repository, PR and protected development target/));
test('refuse review of a different target branch',()=>
  fails(x=>{x.events[5].review.targetBranch='main';},/repository, PR and protected development target/));
test('refuse completed PR missing its protected development target',()=>
  fails(x=>{delete x.events[3].pr.targetBranch;},/COMPLETED: matching repository/));
test('refuse completed PR from a different repository',()=>
  fails(x=>{x.events[3].pr.repository='wrong/repository';},/COMPLETED: matching repository/));
test('refuse integration of another PR with the same head',()=>
  fails(x=>{x.events[7].merge.prNumber+=1;},/authorized protected same-repository\/PR\/target/));
test('refuse missing integrated PR identity',()=>
  fails(x=>{delete x.events[7].merge.prNumber;},/authorized protected same-repository\/PR\/target/));
test('refuse integration evidence from another repository',()=>
  fails(x=>{x.events[7].merge.repository='wrong/repository';},/authorized protected same-repository\/PR\/target/));
test('refuse integration to production main instead of development',()=>
  fails(x=>{x.events[7].merge.targetBranch='main';},/authorized protected same-repository\/PR\/target/));
test('refuse integration without target branch',()=>
  fails(x=>{delete x.events[7].merge.targetBranch;},/authorized protected same-repository\/PR\/target/));
test('refuse integration against a stale development base',()=>
  fails(x=>{x.events[7].merge.developmentBeforeSha=A;},/authorized protected same-repository\/PR\/target/));
test('refuse candidate CI carrying a push event',()=>
  fails(x=>{x.events[5].ci.event='push';},/candidate exact-head Development CI provenance/));
test('refuse candidate CI with no event provenance',()=>
  fails(x=>{delete x.events[5].ci.event;},/candidate exact-head Development CI provenance/));
test('refuse candidate CI with wrong workflow name',()=>
  fails(x=>{x.events[5].ci.workflow='untrusted-check';},/candidate exact-head Development CI provenance/));
test('refuse candidate CI from another repository',()=>
  fails(x=>{x.events[5].ci.repository='wrong/repository';},/candidate exact-head Development CI provenance/));
test('refuse candidate CI for another PR',()=>
  fails(x=>{x.events[5].ci.prNumber+=1;},/candidate exact-head Development CI provenance/));
test('refuse candidate CI for stale base',()=>
  fails(x=>{x.events[5].ci.baseSha=A;},/candidate exact-head Development CI provenance/));
test('refuse candidate CI for wrong target',()=>
  fails(x=>{x.events[5].ci.targetBranch='main';},/candidate exact-head Development CI provenance/));
test('refuse candidate CI with missing base ref',()=>
  fails(x=>{delete x.events[5].ci.baseRef;},/candidate exact-head Development CI provenance/));
test('refuse secondary candidate CI stage swapped with push evidence',()=>
  fails(x=>{x.events[6].ci.event='push';},/candidate exact-head Development CI provenance/));
test('refuse postmerge CI carrying a pull_request event',()=>
  fails(x=>{x.events[8].postmergeCi.event='pull_request';},/postmerge exact-head Development CI provenance/));
test('refuse postmerge CI without event type',()=>
  fails(x=>{delete x.events[8].postmergeCi.event;},/postmerge exact-head Development CI provenance/));
test('refuse postmerge CI from a different repository',()=>
  fails(x=>{x.events[8].postmergeCi.repository='wrong/repository';},/postmerge exact-head Development CI provenance/));
test('refuse postmerge CI for main instead of protected development',()=>
  fails(x=>{x.events[8].postmergeCi.branch='main';},/postmerge exact-head Development CI provenance/));
test('refuse postmerge CI from wrong workflow',()=>
  fails(x=>{x.events[8].postmergeCi.workflow='not-development';},/postmerge exact-head Development CI provenance/));
test('refuse missing postmerge CI target branch',()=>
  fails(x=>{delete x.events[8].postmergeCi.targetBranch;},/postmerge exact-head Development CI provenance/));
test('refuse review pending event targeting another PR',()=>
  fails(x=>{x.events[4].prNumber+=1;},/REVIEW_PENDING: stale PR head/));
test('refuse review pending event citing another repository',()=>
  fails(x=>{x.events[4].repository='wrong/repository';},/REVIEW_PENDING: stale PR head/));
test('refuse integration pending event citing another PR',()=>
  fails(x=>{x.events[6].prNumber+=1;},/INTEGRATION_PENDING: stale reviewed PR head/));
test('refuse integration pending event citing an older base',()=>
  fails(x=>{x.events[6].currentDevelopmentSha=A;},/INTEGRATION_PENDING: stale reviewed PR head/));

// SDC 03 second independent review: a PR CI and the post-merge push CI
// cannot be the same GitHub Actions run, even if asserted event types differ.
test('valid candidate CI identity is reusable at review and integration, but not postmerge',()=>{
  const x=fixture();
  assert.equal(x.events[5].ci.runId,x.events[6].ci.runId);
  assert.equal(x.events[5].ci.reference,x.events[6].ci.reference);
  assert.notEqual(x.events[5].ci.runId,x.events[8].postmergeCi.runId);
  assert.notEqual(x.events[5].ci.reference,x.events[8].postmergeCi.reference);
  assert.equal(verify(x).state,'VERIFIED');
});
test('reject same candidate GitHub Actions run ID as postmerge push CI',()=>
  fails(x=>{x.events[8].postmergeCi.runId=x.events[5].ci.runId;},/candidate CI run ID or reference replayed as post-merge CI/));
test('reject same candidate GitHub Actions run reference as postmerge push CI',()=>
  fails(x=>{x.events[8].postmergeCi.reference=x.events[5].ci.reference;},/candidate CI run ID or reference replayed as post-merge CI/));
test('reject changing the reviewed candidate CI run at integration',()=>
  fails(x=>{x.events[6].ci.runId='different-candidate-ci';},/reviewed candidate CI run identity\/reference changed/));

test('reject impossible UTC calendar days in receipt events', () => {
  for (const at of ['2026-02-29T00:01:00Z', '2026-02-30T00:01:00Z', '2026-04-31T00:01:00Z', '2026-11-21T24:00:00Z']) {
    const x = fixture(); x.events = x.events.slice(0, 1);
    x.events[0].at = at;
    x.observedAt = new Date(Date.parse(at) + 60_000).toISOString();
    assert.throws(() => verify(x), /ASSIGNED.at: invalid timestamp/);
  }
});

test('reject impossible UTC observation timestamps', () => {
  const x = fixture(); x.events = x.events.slice(0, 1);
  x.events[0].at = '2026-03-01T00:00:00Z';
  x.observedAt = '2026-02-29T00:01:00Z';
  assert.throws(() => verify(x), /observedAt: invalid timestamp/);
});

test('preserve real leap dates and supported UTC fractions', () => {
  const x = fixture(); x.events = x.events.slice(0, 1);
  x.events[0].at = '2024-02-29T00:00:00.123456Z';
  x.observedAt = '2024-02-29T00:01:00.1Z';
  assert.equal(verify(x).state, 'ASSIGNED');
});
