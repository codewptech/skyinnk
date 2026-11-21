import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs, issuePacket, queueDecision, globalMilestoneId, changedPaths, checkChangedPaths,
  updatePacketBody, promptForTask
} from '../scripts/sdc-execution-controller.mjs';

function makeIssue(number, overrides = {}) {
  const state = overrides.state || 'READY';
  const role = overrides.role || 'Chat 03';
  const branch = (role === 'Work' ? 'work' : 'chat03') + '/task-sdc-test-' + number;
  const path = overrides.path || 'scripts/sdc-test-' + number + '.mjs';
  const external = overrides.external || 'none for implementation';
  const tick = String.fromCharCode(96);
  const body = [
    'Global V1 milestone: #58',
    'Workstream: ' + role,
    'Branch: '+tick+branch+tick,
    'Target: '+tick+'development/v1-public-launch'+tick,
    'Delivery lane: ' + (role === 'Work' ? 'Learning Experience' : 'Technical Foundation'),
    'Priority: ' + (overrides.priority || 'P1'),
    'Risk: ' + (overrides.risk || 'ordinary'),
    '',
    '### Outcome',
    'Deliver real and verified task implementation with tests.',
    '',
    '### Execution state',
    state,
    '',
    '### Executor',
    state==='READY' ? 'unclaimed' : 'real-executor-123',
    '',
    '### Claim lease',
    'none / advisory',
    '',
    '### Dependencies',
    '- START: '+(overrides.start || 'none'),
    '- INTEGRATION: none',
    '- SOFT: none',
    '- External approval: '+external,
    '',
    '### Acceptance',
    '- [ ] Observable task delivered.',
    '',
    '### Owned / affected paths',
    '- '+tick+path+tick,
    '',
    '### Reserved shared paths',
    'None.',
    '',
    '### Contract / integration',
    'One global V1 milestone.',
    ''
  ].join('\n') + (overrides.correction ? 'SDC Queue: Reviewer correction\n' : '');
  return {number,state:'open',created_at:overrides.date || '2026-11-20T10:00:00Z',body,title:'Task '+number};
}
const milestone = () => ({number:58,state:'open',title:'[SDC] Global V1 — guest course learning',body:'approved scope'});
const snap = (issues, filesByPr = {}, prs = []) => ({issues:[milestone(),...issues],prs,filesByPr,role:'chat03'});

test('default mode is bounded, and parser refuses unsafe roles and intervals', () => {
  assert.deepEqual(parseArgs([]), {role:'chat03',mode:'once',dryRun:false,pollMs:15000,maxTasks:5});
  assert.equal(parseArgs(['--loop','--max-tasks','3']).mode,'loop');
  assert.throws(()=>parseArgs(['--role','chat01']), /Role/);
  assert.throws(()=>parseArgs(['--poll-ms','1']), /poll/);
  assert.throws(()=>parseArgs(['--max-tasks','999']), /max/);
});
test('selects a single eligible READY issue and leaves other tasks queued', () => {
  const result=queueDecision(snap([makeIssue(61),makeIssue(62)]));
  assert.equal(result.kind,'ready');
  assert.equal(result.task.issue.number,61);
  assert.deepEqual(result.queued,[62]);
});
test('mandatory reviewer correction takes priority over newer milestone work', () => {
  const result=queueDecision(snap([
    makeIssue(61,{priority:'P0',date:'2026-11-18T00:00:00Z'}),
    makeIssue(62,{priority:'P3',correction:true,date:'2026-11-20T00:00:00Z'})
  ]));
  assert.equal(result.task.issue.number,62);
});
test('active CURRENT task blocks picking new queued tasks in the same lane', () => {
  const result=queueDecision(snap([makeIssue(61,{state:'BUILDING'}),makeIssue(62)]));
  assert.equal(result.kind,'busy');
  assert.match(result.reasons[0], /Current claim #61/);
});
test('workstream lanes are independent but do not impersonate Chat 01', () => {
  const issues=[makeIssue(61,{role:'Work'}),makeIssue(62,{role:'Chat 03'})];
  assert.equal(queueDecision(snap(issues)).task.issue.number,62);
  assert.equal(queueDecision({...snap(issues),role:'work'}).task.issue.number,61);
});
test('refuses READY work with overlapping open PR paths', () => {
  const result=queueDecision(snap([makeIssue(61)],{19:['scripts/sdc-test-61.mjs']},[{number:19}]));
  assert.equal(result.kind,'idle');
  assert.match(result.blocked[0].reasons.join(' '),/Open PR conflict/);
});
test('refuses incomplete open PR file inventory', () => {
  assert.equal(queueDecision(snap([makeIssue(61)],{},[{number:7}])).kind,'blocked');
});
test('refuses conflicting unpublished claimed paths', () => {
  const current=makeIssue(70,{role:'Work',state:'BUILDING',path:'scripts/sdc-test-61.mjs'});
  const result=queueDecision(snap([current,makeIssue(61)]));
  assert.equal(result.kind,'idle');
  assert.match(result.blocked[0].reasons.join(' '), /Active task claim conflict/);
});
test('explicitly unclaimed BLOCKED issue does not hold an active file lease', () => {
  const blocked=makeIssue(70,{role:'Work',state:'BLOCKED',path:'scripts/sdc-test-61.mjs'});
  blocked.body=blocked.body.replace('### Executor\nreal-executor-123','### Executor\nunclaimed');
  const result=queueDecision(snap([blocked,makeIssue(61)]));
  assert.equal(result.kind,'ready');
  assert.equal(result.task.issue.number,61);
});
test('refuses gated tasks even if declared READY', () => {
  const result=queueDecision(snap([makeIssue(61,{external:'owner approval required for deployment'})]));
  assert.equal(result.kind,'idle');
  assert.match(result.blocked[0].reasons.join(' '),/Owner approval gate/);
});
test('accepts only tasks linked to the one active global V1 milestone record', () => {
  const task=makeIssue(61);
  assert.equal(globalMilestoneId(task.body),58);
  const missing={...task,body:task.body.replace('Global V1 milestone: #58\n','')};
  assert.equal(queueDecision(snap([missing])).kind,'idle');
  assert.equal(queueDecision({...snap([task]),issues:[task]}).kind,'idle');
});
test('refuses malformed task packets rather than guessing', () => {
  const issue={...makeIssue(61),body:'Workstream: Chat 03\n### Execution state\nREADY'};
  assert.equal(queueDecision(snap([issue])).kind,'idle');
});
test('rejects hard START dependencies until DONE with closed issue evidence', () => {
  const issue=makeIssue(61,{start:'#50'});
  assert.equal(queueDecision(snap([issue])).kind,'idle');
  const prior=makeIssue(50,{state:'DONE'});
  prior.state='closed';
  assert.equal(queueDecision(snap([issue,prior])).kind,'ready');
});
test('changed paths retain leading spaces and cover both rename paths', () => {
  assert.deepEqual(changedPaths(' M file-a.mjs\0?? file-b.mjs\0R  new.mjs\0old.mjs\0'),
    ['file-a.mjs','file-b.mjs','new.mjs','old.mjs']);
  assert.throws(()=>changedPaths('garbage\0'),/Unexpected/);
});
test('changed paths must be covered by exact claims, never broad prefixes', () => {
  assert.deepEqual(checkChangedPaths(['scripts/a.mjs'],['scripts/a.mjs']),[]);
  assert.match(checkChangedPaths(['scripts/a.mjs'],['scripts/'])[0],/outside/);
  assert.match(checkChangedPaths(['../token'],['../token'])[0],/outside/);
  assert.match(checkChangedPaths([],['scripts/a.mjs'])[0],/No changed/);
});
test('packet transition preserves all other source contract details', () => {
  const issue=makeIssue(61);
  const changed=updatePacketBody(issue.body,'CLAIMED','local-run-123');
  assert.match(changed,/### Execution state\nCLAIMED/);
  assert.match(changed,/### Executor\nlocal-run-123/);
  assert.ok(changed.includes('### Owned / affected paths\n- ' + String.fromCharCode(96) + 'scripts/sdc-test-61.mjs'));
  assert.throws(()=>updatePacketBody('bad','CLAIMED','x'),/Unrecognized/);
});
test('Codex task prompt conveys exact approved file paths and safety boundaries', () => {
  const prompt=promptForTask(issuePacket(makeIssue(61)),'abc123');
  assert.match(prompt,/Issue #61/);
  assert.match(prompt,/Allowed changed paths ONLY: scripts\/sdc-test-61.mjs/);
  assert.match(prompt,/In THIS SINGLE execution:/);
  assert.match(prompt,/Do not stop after planning/);
  assert.match(prompt,/never modify unclaimed paths/);
  assert.match(prompt,/abc123/);
});
