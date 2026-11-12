import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import { once } from 'node:events';
import {
  DEVELOPMENT, CHECK_NAME, LEGACY_FILES, validatePolicy,
} from '../security/trusted-governance/policy.mjs';
import {
  appJwt, verifySignature, GithubAppClient, evaluateOpenPulls,
} from '../security/trusted-governance/github-app.mjs';
import { webhookServer } from '../security/trusted-governance/server.mjs';

const HEAD = 'a'.repeat(40);
const REPO = 'codewptech/skyinnk';
const claim = (role = 'Chat 03', branch = 'chat03/task-7-trusted-governance', paths = []) => ({
  number: 7, state: 'open',
  body: `Workstream: ${role}\nBranch: \`${branch}\`\n### Reserved shared paths\n${paths.map(p => '- `' + p + '`').join('\n')}\n\n### Acceptance\nTest`,
});
const valid = (extra = {}) => ({
  number: 12, head: 'chat03/task-7-trusted-governance', base: DEVELOPMENT,
  headRepo: REPO, body: 'Task issue: #7', files: ['server/api/v1/health.get.ts'],
  issue: claim(), openPulls: [], ...extra,
});
const errors = v => validatePolicy(v).join('\n');

test('valid Chat 03 technical PR passes with exact task claim', () => {
  assert.deepEqual(validatePolicy(valid()), []);
});
test('reject invalid or missing task issue / closed ownership', () => {
  assert.match(errors(valid({ body: '', issue: null })), /Missing Task issue|invalid, closed/);
  assert.match(errors(valid({ issue: { ...claim(), state: 'closed' } })), /closed/);
  assert.match(errors(valid({ issue: claim('Work') })), /workstream/);
  assert.match(errors(valid({ issue: claim('Chat 03', 'chat03/task-other') })), /branch claim/);
  assert.match(errors(valid({ issue: { ...claim(), pull_request: {} } })), /non-issue/);
});
test('reject invalid branch, cross-repository fork, and main target', () => {
  assert.match(errors(valid({ head: 'chat03/random' })), /Invalid task-specific/);
  assert.match(errors(valid({ headRepo: 'other/fork' })), /internal feature branch/);
  assert.match(errors(valid({ base: 'main' })), /development integration/);
});
test('Work cannot edit backend, Auth0, trusted checker or release-state even when self-reserved', () => {
  const branch = 'work/task-content';
  const files = ['server/api/v1/health.get.ts', 'app/middleware/auth0-sync.ts',
    'security/trusted-governance/policy.mjs', 'docs/releases/V1-RELEASE-STATE.md'];
  const e = errors(valid({ head: branch, files, issue: claim('Work', branch, files) }));
  for (const file of files) assert.ok(e.includes(file), file);
});
test('reject governance modifications by other roles even if issue claims exact paths', () => {
  for (const role of ['Work', 'Chat 03']) {
    const branch = role === 'Work' ? 'work/task-help' : 'chat03/task-help';
    const path = 'scripts/verify-pr-governance.mjs';
    assert.match(errors(valid({ head: branch, files: [path], issue: claim(role, branch, [path]) })), /Unauthorized governance/);
  }
  assert.match(errors(valid({ files: ['docs/governance/DEVELOPMENT-WORKFLOW.md'], issue: claim('Chat 03', 'chat03/task-7-trusted-governance', ['docs/governance/DEVELOPMENT-WORKFLOW.md']) })), /Unauthorized governance/);
});
test('exact shared-file reservation required even with valid task claim', () => {
  assert.match(errors(valid({ files: ['.github/workflows/development-ci.yml'] })), /Missing exact shared-file reservation/);
  assert.deepEqual(validatePolicy(valid({
    files: ['.github/workflows/development-ci.yml'],
    issue: claim('Chat 03', 'chat03/task-7-trusted-governance', ['.github/workflows/development-ci.yml']),
  })), []);
});
test('Chat 01 cannot implement arbitrary application code', () => {
  const branch = 'chat01/task-governance';
  assert.match(errors(valid({ head: branch, files: ['app/pages/index.vue'], issue: claim('Chat 01', branch, ['app/pages/index.vue']) })), /Chat 01 may only/);
});
test('overlap with competing open PR is blocked even with a valid issue/reservation', () => {
  assert.match(errors(valid({
    files: ['server/api/v1/health.get.ts'],
    openPulls: [{ number: 10, base: DEVELOPMENT, files: ['server/api/v1/health.get.ts'] }],
  })), /Overlapping open PR #10/);
});
test('legacy PR #1 allows only frozen reviewed filenames and retains safety/overlap', () => {
  const legacy = valid({ number: 1, head: 'work/v1-public-learning-integration',
    body: '', issue: null, files: [...LEGACY_FILES] });
  assert.deepEqual(validatePolicy(legacy), []);
  assert.match(errors({ ...legacy, files: [...legacy.files, 'server/api/v1/private.post.ts'] }), /unreviewed path/);
  assert.match(errors({ ...legacy, files: ['package.json'],
    openPulls: [{ number: 22, base: DEVELOPMENT, files: ['package.json'] }] }), /Overlapping open PR #22/);
});
test('source tampering in PR cannot alter trusted policy; the malicious file is rejected', () => {
  const branch = 'work/task-bypass';
  const fixture = valid({ head: branch, files: ['scripts/verify-pr-governance.mjs'],
    issue: claim('Work', branch, ['scripts/verify-pr-governance.mjs']),
    // This field is arbitrary attacker-controlled webhook/PR content. Never executed.
    untrustedPolicy: "export function validatePolicy(){return []}",
  });
  assert.match(errors(fixture), /Unauthorized governance/);
});
test('signature validation authenticates exact payload and rejects tampering', () => {
  const secret = 'long-webhook-secret-for-only-this-service';
  const payload = Buffer.from('{"name":"safe"}');
  const signature = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifySignature(secret, payload, signature), true);
  assert.equal(verifySignature(secret, Buffer.from('{"name":"evil"}'), signature), false);
  assert.equal(verifySignature(secret, payload, 'sha256=deadbeef'), false);
  assert.equal(verifySignature('', payload, signature), false);
});
test('GitHub App JWT is independently signed and constrained to short lifetime', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwt = appJwt('1234', privateKey.export({ type: 'pkcs8', format: 'pem' }), 1_700_000_000_000);
  const [header, claims, signature] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
  assert.equal(JSON.parse(Buffer.from(claims, 'base64url')).iss, '1234');
  assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + claims), publicKey, Buffer.from(signature, 'base64url')), true);
});
test('GitHub App requests narrow installation rights and publishes check on exact SHA', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url.endsWith('/access_tokens')) return { ok: true, json: async () => ({ token: 'mock-secret', expires_at: new Date(Date.now() + 3600000).toISOString() }) };
    if (url.endsWith('/check-runs')) return { ok: true, json: async () => ({ id: 1 }) };
    throw new Error('Unexpected network path ' + url);
  };
  const api = new GithubAppClient({ appId: '123', privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }), installationId: '456', fetchImpl: mockFetch });
  await api.check(HEAD, []);
  assert.equal(calls.length, 2);
  const rights = JSON.parse(calls[0].opts.body).permissions;
  assert.deepEqual(rights, { checks: 'write', issues: 'read', pull_requests: 'read', metadata: 'read' });
  const check = JSON.parse(calls[1].opts.body);
  assert.equal(check.head_sha, HEAD);
  assert.equal(check.name, CHECK_NAME);
  assert.equal(check.conclusion, 'success');
  assert.equal(calls.every(x => !x.url.includes('/contents/') && !x.url.includes('/git/blobs/')), true);
});
test('full evaluation fetches GitHub metadata only and fails invalid task claim', async () => {
  const branch = 'work/task-catalogue';
  const pr = { number: 12, state: 'open', body: 'Task issue: #7',
    head: { ref: branch, sha: HEAD, repo: { full_name: REPO } }, base: { ref: DEVELOPMENT } };
  const entries = [];
  const client = {
    openPulls: async () => [pr],
    pull: async () => pr,
    files: async () => ['server/api/v1/health.get.ts'],
    issue: async () => claim('Work', branch),
    check: async (sha, errors) => entries.push({ sha, errors }),
  };
  const result = await evaluateOpenPulls(client);
  assert.equal(result.length, 1);
  assert.equal(result[0].ok, false);
  assert.match(entries[0].errors.join(' '), /Workstream protected/);
});
test('cross-PR overlap re-evaluates both competitors and rejects both', async () => {
  const one = { number: 13, state: 'open', body: 'Task issue: #7', head: { ref: 'chat03/task-one', sha: HEAD, repo: { full_name: REPO } }, base: { ref: DEVELOPMENT } };
  const two = { ...one, number: 14, head: { ref: 'chat03/task-two', sha: 'b'.repeat(40), repo: { full_name: REPO } } };
  const checked = [];
  const client = {
    openPulls: async () => [one, two],
    pull: async n => n === 13 ? one : two,
    files: async () => ['server/api/v1/health.get.ts'],
    issue: async () => claim('Chat 03', 'chat03/task-one'),
    check: async (sha, errs) => checked.push({ sha, errs }),
  };
  const result = await evaluateOpenPulls(client);
  assert.equal(result.length, 2);
  assert.equal(result.every(x => !x.ok), true);
  assert.equal(checked.every(x => x.errs.some(e => e.includes('Overlapping'))), true);
});
test('evaluation does not publish a stale success after PR head changes', async () => {
  const original = { number: 13, state: 'open', body: 'Task issue: #7', head: { ref: 'chat03/task-one', sha: HEAD, repo: { full_name: REPO } }, base: { ref: DEVELOPMENT } };
  let fetches = 0; let published = false;
  const client = {
    openPulls: async () => [original],
    pull: async () => { fetches++; return fetches === 1 ? original : { ...original, head: { ...original.head, sha: 'c'.repeat(40) } }; },
    files: async () => ['server/api/v1/health.get.ts'],
    issue: async () => claim('Chat 03', 'chat03/task-one'),
    check: async () => { published = true; },
  };
  const result = await evaluateOpenPulls(client);
  assert.equal(result[0].skipped, true);
  assert.equal(published, false);
});
test('webhook handler rejects invalid HMAC and wrong installation, accepts signed request', async () => {
  const secret = 'random-strong-webhook-secret-for-tests';
  let calls = 0;
  const { server, waitUntilIdle } = webhookServer({ secret, repository: REPO, installationId: 456,
    evaluate: async () => { calls++; return []; }, log: { info() {}, error() {} } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/github/webhook`;
  async function send(data, signature = true) {
    const body = JSON.stringify(data);
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    return fetch(url, { method: 'POST', headers: {
      'x-hub-signature-256': signature ? sig : 'sha256=' + '0'.repeat(64),
      'x-github-event': 'pull_request',
    }, body });
  }
  try {
    assert.equal((await send({ repository: { full_name: REPO }, installation: { id: 456 } }, false)).status, 401);
    assert.equal((await send({ repository: { full_name: REPO }, installation: { id: 999 } })).status, 403);
    assert.equal((await send({ repository: { full_name: REPO }, installation: { id: 456 } })).status, 202);
    await waitUntilIdle();
    assert.equal(calls, 1);
  } finally { server.close(); await once(server, 'close'); }
});
