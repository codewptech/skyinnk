import test from 'node:test';
import assert from 'node:assert/strict';
import { roleForBranch, taskIssueNumber, reservedPaths, validatePolicy } from '../scripts/verify-pr-governance.mjs';

const tick = String.fromCharCode(96);
const issue = (role, branch, paths = []) => ({
  number: 5, state: 'open',
  body: 'Workstream: ' + role + '\nBranch: ' + tick + branch + tick
    + '\n### Reserved shared paths\n' + paths.map(x => '- ' + tick + x + tick).join('\n')
    + '\n\n### Acceptance\nOK',
});
const base = (extra = {}) => ({
  number: 6, head: 'chat01/task-enforce-workflow',
  base: 'development/v1-public-launch', body: 'Task issue: #5',
  files: ['AGENTS.md'],
  issue: issue('Chat 01', 'chat01/task-enforce-workflow', ['AGENTS.md']),
  openPulls: [], ...extra,
});
test('only task-prefixed workstream branches accepted', () => {
  assert.equal(roleForBranch('work/task-classroom'), 'work');
  assert.equal(roleForBranch('chat03/task-auth0-api'), 'chat03');
  assert.equal(roleForBranch('chat01/task-governance'), 'chat01');
  assert.equal(roleForBranch('work/old-branch'), null);
});
test('exact task issue parsed', () => {
  assert.equal(taskIssueNumber('Task issue: #45\n'), 45);
  assert.equal(taskIssueNumber('see #45'), 0);
});
test('exact shared reservations parsed', () => {
  assert.deepEqual([...reservedPaths(issue('Chat 01','branch',['AGENTS.md','package.json']).body)],['AGENTS.md','package.json']);
});
test('governance PR with reservation passes', () => assert.deepEqual(validatePolicy(base()), []));
test('unreserved shared file rejected', () => {
  assert.match(validatePolicy(base({ files:['package.json'] })).join(' '),/must be reserved/);
});
test('unclaimed branch and task rejected', () => {
  assert.ok(validatePolicy(base({head:'work/legacy',issue:null,body:''})).length>=3);
});
test('Work cannot edit technical source or release state', () => {
  const head='work/task-lesson';
  const errors=validatePolicy(base({head,issue:issue('Work',head),
    files:['server/api/v1/health.get.ts','docs/releases/V1-RELEASE-STATE.md']}));
  assert.equal(errors.filter(x=>x.includes('Work may not')).length,2);
});
test('Chat 03 backend permitted; unreserved Work-owned UI rejected', () => {
  const head='chat03/task-api-fix';
  assert.deepEqual(validatePolicy(base({head,issue:issue('Chat 03',head),
    files:['server/api/v1/health.get.ts']})),[]);
  assert.match(validatePolicy(base({head,issue:issue('Chat 03',head),
    files:['app/pages/index.vue']})).join(' '),/Work-owned UI/);
});
test('Chat 01 cannot implement routine application source', () => {
  assert.match(validatePolicy(base({files:['app/pages/index.vue']})).join(' '),/governance\/architecture-only/);
});
test('overlapping open PR file changes rejected', () => {
  const errors=validatePolicy(base({openPulls:[{number:1,base:'development/v1-public-launch',files:['AGENTS.md']}]}));
  assert.match(errors.join(' '),/overlap with open PR #1/);
});
test('legacy PR #1 exempt only for its exact number and branch', () => {
  assert.deepEqual(validatePolicy(base({number:1,head:'work/v1-public-learning-integration',
    body:'',issue:null,files:['package.json']})),[]);
  assert.ok(validatePolicy(base({number:2,head:'work/v1-public-learning-integration',
    body:'',issue:null})).length);
});
