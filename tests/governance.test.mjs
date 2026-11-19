import test from 'node:test';
import assert from 'node:assert/strict';
import { roleForBranch, taskIssueNumber, reservedPaths, isSharedPath, changedPaths, assertEventRevision, validatePolicy, validatePeaPull } from '../scripts/verify-pr-governance.mjs';

const tick = String.fromCharCode(96);
const issue = (role, branch, paths = []) => ({
  number: 5, state: 'open',
  body: 'Workstream: ' + role + '\nBranch: ' + tick + branch + tick
    + '\n### Reserved shared paths\n' + paths.map(x => '- ' + tick + x + tick).join('\n')
    + '\n\n### Acceptance\nOK',
});
const base = (extra = {}) => ({
  number: 6, head: 'chat01/task-enforce-workflow',
  headRepo: 'codewptech/skyinnk',
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
  assert.equal(taskIssueNumber('Task issue: #45\nTask issue: #46'), 0);
  assert.equal(taskIssueNumber('Task issue: #9007199254740992'), 0);
});
test('active policy rejects fork ownership and stale event revisions', () => {
  assert.match(validatePolicy(base({ headRepo: 'fixture/skyinnk' })).join(' '), /internal feature branch/);
  const current = { state: 'open', head: { sha: 'candidate', ref: 'work/task-lesson' },
    base: { sha: 'base', ref: 'development/v1-public-launch' } };
  assert.doesNotThrow(() => assertEventRevision(current, current));
  assert.throws(() => assertEventRevision(current, { ...current, base: { ...current.base, sha: 'new' } }),
    /PR revision changed/);
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
test('merged PR #1 has no legacy exception in active CI', () => {
  const errors = validatePolicy(base({
    number: 1, head: 'work/v1-public-learning-integration',
    body: '', issue: null, files: ['package.json'],
  }));
  assert.match(errors.join(' '), /Feature branch must/);
  assert.match(errors.join(' '), /Task issue/);
});

test('renamed paths retain old ownership, exact reservations and open-PR overlap', () => {
  const head = 'work/task-lesson';
  const source = 'security/trusted-governance/policy.mjs';
  const files = changedPaths([{
    status: 'renamed', previous_filename: source, filename: 'app/relocated.mjs',
  }, { status: 'modified', filename: 'app/relocated.mjs' }]);
  assert.deepEqual(files, [source, 'app/relocated.mjs']);
  const overlapping = changedPaths([{
    status: 'renamed', previous_filename: source, filename: 'security/other.mjs',
  }]);
  const errors = validatePolicy(base({
    head, files, issue: issue('Work', head),
    openPulls: [{ number: 9, base: 'development/v1-public-launch', files: overlapping }],
  }));
  assert.match(errors.join(' '), /Work may not change/);
  assert.match(errors.join(' '), /overlap with open PR #9/);
  const shared = changedPaths([{
    status: 'renamed', previous_filename: 'README.md', filename: 'docs/readme.md',
  }]);
  assert.match(validatePolicy(base({ head, files: shared, issue: issue('Work', head) })).join(' '),
    /Shared file README.md must be reserved/);
});

test('missing old path metadata rejects a rename', () => {
  assert.throws(() => changedPaths([{ status: 'renamed', filename: 'app/lesson.vue' }]),
    /Invalid GitHub changed-file metadata/);
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

const dev = 'development/v1-public-launch';
const repo = { full_name: 'codewptech/skyinnk' };
const currentBase = 'a'.repeat(40);
const prerequisiteMerge = 'b'.repeat(40);
const claimBranch = 'work/task-learning-fixture';
const lesson = 'app/pages/courses/lesson.vue';
const passingCheck = { id: 1, name: 'Development CI', app: { id: 15368 }, head_sha: prerequisiteMerge,
  status: 'completed', conclusion: 'success', details_url: 'https://github.com/codewptech/skyinnk/actions/runs/100/job/1' };
const pushRun = { id: 100, event: 'push', head_sha: prerequisiteMerge, head_branch: dev,
  path: '.github/workflows/development-ci.yml', status: 'completed', conclusion: 'success' };

function peaIssue(number, {
  branch = claimBranch, status = 'PR_OPEN', executor = 'codex fixture-run-id',
  start = 'none', integration = 'none', soft = 'none', owned = '- `' + lesson + '`',
  lease = 'none / advisory', state = 'open', state_reason = null,
} = {}) {
  return { number, state, state_reason, body: [
    'Workstream: Work', 'Branch: `' + branch + '`', 'Target: `' + dev + '`',
    'Delivery lane: Learning Experience', 'Priority: P1', 'Risk: ordinary',
    '### Outcome', 'Verify a public course and lesson with local fixtures.',
    '### Execution state', status, '### Executor', executor, '### Claim lease', lease,
    '### Dependencies', '- START: ' + start, '- INTEGRATION: ' + integration, '- SOFT: ' + soft,
    '- External approval: none', '### Acceptance', '- [ ] Test the fixture.',
    '### Owned / affected paths', owned, '### Reserved shared paths', 'None.',
  ].join('\n') };
}

function mergedDependency(number, task = null, branch = 'work/task-earlier-work') {
  return {
    number, merged: true, merge_commit_sha: prerequisiteMerge, body: task ? 'Task issue: #' + task : '',
    head: { ref: branch, repo }, base: { ref: dev, repo },
  };
}

function gate({ task = peaIssue(44), routes = {}, open = [], oldPulls = [],
  openPulls = [], files = [lesson], draft = false, head = claimBranch } = {}) {
  const calls = [];
  const get = {
    ['/commits/' + prerequisiteMerge + '/check-runs?filter=all&per_page=100']: { total_count: 1, check_runs: [passingCheck] },
    '/actions/runs/100': pushRun,
    ['/compare/' + prerequisiteMerge + '...' + currentBase]: { status: 'ahead', merge_base_commit: { sha: prerequisiteMerge } },
    ...routes,
  };
  const lists = {
    '/issues?state=open': [task, ...open],
    ['/pulls?state=closed&base=' + encodeURIComponent(dev)]: oldPulls,
  };
  const read = map => async path => {
    calls.push(path);
    assert.ok(Object.hasOwn(map, path), 'Unexpected GitHub read ' + path);
    return map[path];
  };
  const pr = { number: 80, draft, head: { ref: head }, base: { ref: dev, sha: currentBase } };
  return { calls, run: () => validatePeaPull({ issue: task, pr, files, openPulls, api: read(get), collect: read(lists) }) };
}

test('existing issues stay on the legacy contract and new issues must use the typed packet', async () => {
  const legacy = gate({ task: { ...issue('Work', claimBranch), number: 43 } });
  assert.deepEqual(await legacy.run(), []);
  assert.deepEqual(legacy.calls, []);
  const current = gate({ task: { ...issue('Work', claimBranch), number: 44 } });
  assert.match((await current.run()).join('|'), /Invalid delivery lane/);
  assert.deepEqual(current.calls, []);
  assert.deepEqual(await gate().run(), []);
});

test('actual PR metadata, every changed path and a valid claim are required', async () => {
  assert.match((await gate({ head: 'work/task-other' }).run()).join('|'), /match the actual PR/);
  const files = changedPaths([{ status: 'renamed', previous_filename: 'app/old.vue', filename: lesson }]);
  assert.match((await gate({ files }).run()).join('|'), /outside the PEA-2 claim: app\/old.vue/);
  const both = peaIssue(44, { owned: '- `app/old.vue`\n- `' + lesson + '`' });
  assert.deepEqual(await gate({ files, task: both }).run(), []);
  const malformed = peaIssue(44, { owned: '- `' + lesson + '`\n- app/old.vue' });
  assert.match((await gate({ task: malformed }).run()).join('|'), /Malformed affected path/);
  assert.match((await gate({ task: peaIssue(44, { lease: '', executor: 'unclaimed' }) }).run()).join('|'), /executor and an advisory or lease claim/);
});

test('PR lifecycle rejects work that has not reached a PR and rejects a draft ready for integration', async () => {
  for (const status of ['BACKLOG', 'READY', 'CLAIMED', 'BUILDING', 'PAUSED', 'DONE']) {
    assert.match((await gate({ task: peaIssue(44, { status }) }).run()).join('|'), /PR or review state/);
  }
  const candidate = peaIssue(44, { status: 'READY_TO_INTEGRATE' });
  assert.match((await gate({ task: candidate, draft: true }).run()).join('|'), /consistent with this pull request/);
  assert.deepEqual(await gate({ task: candidate }).run(), []);
  assert.deepEqual(await gate({ draft: true }).run(), []);
});

test('a declared competing branch or reserved path blocks a PR across states', async () => {
  const same = peaIssue(45, { status: 'PAUSED', owned: '- `app/other.vue`' });
  assert.match((await gate({ open: [same] }).run()).join('|'), /conflicts with issue #45/);
  const disjoint = peaIssue(46, { branch: 'work/task-other', owned: '- `app/other.vue`' });
  assert.deepEqual(await gate({ open: [disjoint] }).run(), []);
  const crossBranch = peaIssue(46, { branch: 'work/task-other' });
  assert.match((await gate({ open: [crossBranch] }).run()).join('|'), /conflicts with issue #46/);
  const task = peaIssue(44, { owned: '- `' + lesson + '`\n- `app/future.vue`' });
  const openPulls = [{ number: 82, base: dev, files: ['app/future.vue'] }];
  assert.match((await gate({ task, openPulls }).run()).join('|'), /overlaps open PR #82/);
});

test('START requires a task and does not accept a closed task without verified integration', async () => {
  const task = peaIssue(44, { start: '#45' });
  const wrongType = { number: 45, pull_request: {} };
  assert.match((await gate({ task, routes: { '/issues/45': wrongType } }).run()).join('|'), /missing START issue #45/);
  const closed = peaIssue(45, { status: 'DONE', state: 'closed', state_reason: 'completed' });
  assert.match((await gate({ task, routes: { '/issues/45': closed } }).run()).join('|'), /START dependency #45.*no verified/);
  const done = mergedDependency(61, 45, claimBranch);
  const options = { task, oldPulls: [done], routes: { '/issues/45': closed, '/pulls/61': done } };
  assert.deepEqual(await gate(options).run(), []);
  const stale = { ...closed, state: 'open' };
  assert.match((await gate({ ...options, routes: { ...options.routes, '/issues/45': stale } }).run()).join('|'), /START dependency #45/);
});

test('INTEGRATION needs the merged ancestor and latest successful required check', async () => {
  const task = peaIssue(44, { integration: '#45' });
  const upstream = mergedDependency(45);
  const routes = { '/issues/45': { number: 45, pull_request: {} }, '/pulls/45': upstream };
  assert.deepEqual(await gate({ task, routes }).run(), []);
  for (const invalid of [{ ...upstream, merged: false }, { ...upstream, base: { ref: 'main', repo } }]) {
    assert.match((await gate({ task, routes: { ...routes, '/pulls/45': invalid } }).run()).join('|'), /INTEGRATION dependency #45/);
  }
  const checks = { total_count: 2, check_runs: [passingCheck, { ...passingCheck, id: 2, conclusion: 'failure' }] };
  const checkRoute = '/commits/' + prerequisiteMerge + '/check-runs?filter=all&per_page=100';
  assert.match((await gate({ task, routes: { ...routes, [checkRoute]: checks } }).run()).join('|'), /INTEGRATION dependency #45/);
  const compareRoute = '/compare/' + prerequisiteMerge + '...' + currentBase;
  const diverged = { ...routes, [compareRoute]: { status: 'diverged', merge_base_commit: { sha: 'c'.repeat(40) } } };
  assert.match((await gate({ task, routes: diverged }).run()).join('|'), /INTEGRATION dependency #45/);
});

test('hard dependency proof rejects partial check lists and PR runs that did not verify development', async () => {
  const task = peaIssue(44, { integration: '#45' });
  const routes = { '/issues/45': { number: 45, pull_request: {} }, '/pulls/45': mergedDependency(45) };
  const checkRoute = '/commits/' + prerequisiteMerge + '/check-runs?filter=all&per_page=100';
  await assert.rejects(gate({ task, routes: { ...routes, [checkRoute]: { total_count: 2, check_runs: [passingCheck] } } }).run(),
    /Incomplete GitHub check evidence/);
  assert.match((await gate({ task, routes: { ...routes, '/actions/runs/100': { ...pushRun, event: 'pull_request' } } }).run()).join('|'),
    /INTEGRATION dependency #45/);
});

test('SOFT accepts unfinished work and hard dependency cycles fail before CI proof', async () => {
  const optional = peaIssue(45, { status: 'BACKLOG', executor: 'unclaimed' });
  const soft = gate({ task: peaIssue(44, { soft: '#45' }), routes: { '/issues/45': optional } });
  assert.deepEqual(await soft.run(), []);
  assert.deepEqual(soft.calls, ['/issues/45', '/issues?state=open']);
  const dependency = peaIssue(45, { start: '#44', status: 'DONE', state: 'closed', state_reason: 'completed' });
  const cycle = gate({ task: peaIssue(44, { integration: '#45' }), routes: { '/issues/45': dependency } });
  assert.match((await cycle.run()).join('|'), /Dependency cycle/);
});
