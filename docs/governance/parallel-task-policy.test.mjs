import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePacket, validatePacket, changePaths, eligibleTask, integrationEligible,
  detectCycles, nextStateLegal, rankReady,
} from './parallel-task-policy.mjs';

function taskBody(extra = {}) {
  const lines = {
    workstream: 'Work', branch: 'work/task-discovery-check',
    lane: 'Learning Experience', priority: 'P1', risk: 'ordinary',
    state: 'READY', executor: 'unclaimed', start: 'none',
    integration: '#24', soft: '#14', external: 'none for implementation', ...extra,
  };
  return [
    'Workstream: ' + lines.workstream,
    'Branch: `' + lines.branch + '`',
    'Target: development/v1-public-launch',
    'Delivery lane: ' + lines.lane, 'Priority: ' + lines.priority,
    'Risk: ' + lines.risk,
    '### Outcome',
    'Verify an isolated fictional course in a browser without modifying production files.',
    '### Execution state', lines.state,
    '### Executor', lines.executor,
    '### Dependencies',
    '- START: ' + lines.start,
    '- INTEGRATION: ' + lines.integration,
    '- SOFT: ' + lines.soft,
    '- External approval: ' + lines.external,
    '### Acceptance',
    '- [ ] Guest route and negative path observed.',
    '- [ ] Current exact-head CI passes.',
    '### Owned / affected paths',
    '- `app/pages/courses/index.vue`',
    '### Reserved shared paths',
    'None.',
  ].join('\n');
}
test('valid task packet is parsed and validated', () => {
  const body = taskBody(), packet = parsePacket(body);
  assert.deepEqual(validatePacket(packet, { number: 99 }), []);
  assert.equal(packet.branch, 'work/task-discovery-check');
  assert.deepEqual(packet.integration, [24]);
  assert.deepEqual(packet.soft, [14]);
  assert.equal(body, taskBody());
});
test('invalid placeholders cannot become ready', () => {
  assert.ok(validatePacket(parsePacket(taskBody({workstream:'REPLACE_WITH_Work'}))).length);
  assert.ok(validatePacket(parsePacket(taskBody({branch:'REPLACE_WITH_role/task-x'}))).length);
});
test('role ownership must match delivery lane', () => {
  assert.match(validatePacket(parsePacket(taskBody({workstream:'Chat 03'}))).join('|'), /Branch|Learning Experience/);
  assert.match(validatePacket(parsePacket(taskBody({lane:'Governance'}))).join('|'), /Governance requires Chat 01/);
});
test('READY and BUILDING require honest executor status', () => {
  assert.match(validatePacket(parsePacket(taskBody({executor:'run:abc'}))).join('|'), /READY task must/);
  assert.match(validatePacket(parsePacket(taskBody({state:'BUILDING'}))).join('|'), /needs real executor/);
});
test('malformed dependency tokens fail closed', () => {
  assert.match(validatePacket(parsePacket(taskBody({start:'unknown-task'}))).join('|'), /Malformed START/);
  assert.match(validatePacket(parsePacket(taskBody({integration:'#24 plus maybe #26'}))).join('|'), /Malformed INTEGRATION/);
});
test('repeated and self-dependencies fail validation', () => {
  assert.match(validatePacket(parsePacket(taskBody({start:'#24'}))).join('|'), /Repeated dependency/);
  assert.match(validatePacket(parsePacket(taskBody({start:'#99'})),{number:99}).join('|'), /Self dependency/);
});
test('START blocks execution but INTEGRATION does not', () => {
  const packet=parsePacket(taskBody({start:'#8'}));
  assert.equal(eligibleTask(packet,{issueStates:{8:'BUILDING'}}).eligible,false);
  assert.equal(eligibleTask(packet,{issueStates:{8:'DONE'}}).eligible,true);
  assert.equal(eligibleTask(parsePacket(taskBody())).eligible,true);
});
test('unpublished task claims prevent overlapping source edits', () => {
  assert.match(eligibleTask(parsePacket(taskBody()),{
    claims:[{id:10,branch:'chat03/task-conflict',paths:['app/pages/courses/index.vue']}],
  }).reasons.join('|'), /Active task claim conflict/);
});
test('rename checks both paths, rejecting incomplete metadata', () => {
  const old='app/pages/courses/index.vue';
  assert.deepEqual(changePaths([{status:'renamed',previous_filename:old,filename:'app/renamed.vue'}]),[old,'app/renamed.vue']);
  assert.match(eligibleTask(parsePacket(taskBody()),{
    openPRs:[{number:88,branch:'chat03/task-conflict',files:[{status:'renamed',previous_filename:old,filename:'app/renamed.vue'}]}],
  }).reasons.join('|'), /Open PR conflict/);
  assert.throws(()=>changePaths([{status:'renamed',filename:'app/new.vue'}]),/Incomplete changed path/);
});
test('graph detects cycles across both blocking dependency classes', () => {
  assert.equal(detectCycles([
    {number:4,packet:{start:[5],integration:[]}},
    {number:5,packet:{start:[],integration:[4]}},
  ]).length,1);
  assert.equal(detectCycles([
    {number:4,packet:{start:[5],integration:[]}},
    {number:5,packet:{start:[],integration:[]}},
  ]).length,0);
});
test('integration requires verified review, exact-head CI and current base', () => {
  const packet={...parsePacket(taskBody()),state:'READY_TO_INTEGRATE'};
  assert.equal(integrationEligible(packet,{
    issueStates:{24:'DONE'},
    pr:{state:'open',headSha:'a'.repeat(40),baseSha:'b'.repeat(40)},
    ciPassed:true,reviewVerified:true,baseCurrent:true,collisions:[],
  }).eligible,true);
  assert.match(integrationEligible(packet,{issueStates:{24:'BUILDING'}}).reasons.join('|'),/INTEGRATION dependency/);
});
test('state transitions cannot skip review or integration', () => {
  assert.equal(nextStateLegal('BACKLOG','DONE'),false);
  assert.equal(nextStateLegal('PR_OPEN','READY_TO_INTEGRATE'),false);
  assert.equal(nextStateLegal('REVIEWING','CHANGES_REQUESTED'),true);
  assert.equal(nextStateLegal('VERIFIED','DONE'),true);
});
test('ranking deterministically orders priority and age', () => {
  assert.ok(rankReady({priority:'P0',number:9},{priority:'P1',number:1})<0);
  assert.ok(rankReady({priority:'P1',unlocks:3},{priority:'P1',unlocks:1})<0);
  assert.ok(rankReady({priority:'P1',unlocks:0,created:1},{priority:'P1',unlocks:0,created:2})<0);
});
