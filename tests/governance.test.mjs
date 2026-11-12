import test from 'node:test';
import assert from 'node:assert/strict';
import { roleForBranch, taskIssueNumber, reservedPaths, isSharedPath, LEGACY_PR1_FILES, validatePolicy } from '../scripts/verify-pr-governance.mjs';

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

test('legacy PR #1 continues to pass unchanged reviewed paths without new task metadata', () => {
  const errors = validatePolicy(base({
    number: 1, head: 'work/v1-public-learning-integration',
    body: '', issue: null, files: [...LEGACY_PR1_FILES],
  }));
  assert.deepEqual(errors, []);
});
test('legacy PR #1 still rejects overlapping open PR files', () => {
  const errors = validatePolicy(base({
    number: 1, head: 'work/v1-public-learning-integration',
    body: '', issue: null, files: [...LEGACY_PR1_FILES],
    openPulls: [{ number: 9, base: 'development/v1-public-launch', files: ['package.json'] }],
  }));
  assert.match(errors.join(' '), /overlap with open PR #9/);
});
test('legacy PR #1 rejects new backend paths and unreviewed extra filenames', () => {
  const errors = validatePolicy(base({
    number: 1, head: 'work/v1-public-learning-integration',
    body: '', issue: null,
    files: ['server/api/v1/new-private-endpoint.get.ts'],
  }));
  assert.match(errors.join(' '), /unreviewed new file/);
  assert.match(errors.join(' '), /Work may not/);
});
test('legacy PR #1 must still target development integration', () => {
  const errors = validatePolicy(base({
    number: 1, head: 'work/v1-public-learning-integration',
    base: 'main', body: '', issue: null, files: ['package.json'],
  }));
  assert.match(errors.join(' '), /Base branch must be development/);
});
test('governance files are protected against Work even when reserved', () => {
  const head = 'work/task-catalogue';
  const files = ['docs/governance/DEVELOPMENT-WORKFLOW.md', '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/development-task.md', 'tests/governance.test.mjs'];
  const errors = validatePolicy(base({ head, files, issue: issue('Work', head, files) }));
  assert.equal(errors.filter(e => e.includes('Governance-owned file')).length, files.length);
});
test('Chat 03 cannot self-reserve Chat 01 governance documents', () => {
  const head = 'chat03/task-ci-review';
  const files = ['docs/architecture/ARCHITECTURE-DECISIONS.md', 'AGENTS.md',
    'scripts/verify-pr-governance.mjs'];
  const errors = validatePolicy(base({ head, files, issue: issue('Chat 03', head, files) }));
  assert.equal(errors.filter(e => e.includes('Governance-owned file')).length, files.length);
});
test('Chat 03 keeps technical CI authority with reserved workflow path', () => {
  const head = 'chat03/task-ci-validation';
  const files = ['.github/workflows/development-ci.yml'];
  assert.deepEqual(validatePolicy(base({ head, files, issue: issue('Chat 03', head, files) })), []);
  assert.match(validatePolicy(base({ head, files, issue: issue('Chat 03', head) })).join(' '),
    /must be reserved/);
});
test('coordinated Chat 03 exception for Work-owned UI requires exact path claim', () => {
  const head = 'chat03/task-classroom-compatibility';
  const path = 'app/pages/courses/index.vue';
  assert.deepEqual(validatePolicy(base({
    head, files: [path], issue: issue('Chat 03', head, [path]),
  })), []);
  assert.match(validatePolicy(base({
    head, files: [path], issue: issue('Chat 03', head),
  })).join(' '), /Work-owned UI/);
});
test('issue template and architecture documentation require exact shared reservations', () => {
  assert.equal(isSharedPath('.github/ISSUE_TEMPLATE/development-task.md'), true);
  assert.equal(isSharedPath('docs/architecture/ARCHITECTURE-DECISIONS.md'), true);
  const files = ['.github/ISSUE_TEMPLATE/development-task.md',
    'docs/architecture/ARCHITECTURE-DECISIONS.md'];
  const errors = validatePolicy(base({ files, issue: issue('Chat 01', 'chat01/task-enforce-workflow') }));
  assert.equal(errors.filter(e => e.includes('must be reserved')).length, 2);
});
