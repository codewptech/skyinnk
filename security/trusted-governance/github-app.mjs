import { createPrivateKey, sign, createHmac, timingSafeEqual } from 'node:crypto';
import { CHECK_NAME, DEVELOPMENT, REPOSITORY, taskIssueNumber, validatePolicy } from './policy.mjs';

const API = 'https://api.github.com';
const MAX_PAGES = 20;
const unavailable = ['Governance could not verify current metadata. Await a fresh scan.'];
export function verifySignature(secret, payload, header) {
  if (typeof secret !== 'string' || secret.length < 20 ||
      typeof header !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(header)) return false;
  const actual = Buffer.from(header.slice(7), 'hex');
  const expected = createHmac('sha256', secret).update(payload).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function appJwt(appId, privateKey, now = Date.now()) {
  if (!/^\d+$/.test(String(appId))) throw new Error('Valid GitHub App ID required');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const timestamp = Math.floor(now / 1000);
  const data = encode({ alg: 'RS256', typ: 'JWT' }) + '.' +
    encode({ iat: timestamp - 60, exp: timestamp + 540, iss: String(appId) });
  return data + '.' + sign('RSA-SHA256', Buffer.from(data), createPrivateKey(privateKey)).toString('base64url');
}

export class GithubAppClient {
  constructor({ appId, privateKey, installationId, fetchImpl = fetch, repository = REPOSITORY }) {
    if (!/^\d+$/.test(String(installationId))) throw new Error('Installation ID required');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
    this.appId = appId; this.privateKey = privateKey;
    this.installationId = installationId; this.fetchImpl = fetchImpl;
    this.repository = repository;
    this.cachedToken = null; this.tokenExpiry = 0;
  }
  async request(method, path, body, token) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid GitHub path');
    const response = await this.fetchImpl(API + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
    return response.json();
  }
  async token() {
    if (this.cachedToken && Date.now() < this.tokenExpiry) return this.cachedToken;
    const jwt = appJwt(this.appId, this.privateKey);
    const result = await this.request('POST', `/app/installations/${this.installationId}/access_tokens`,
      { repositories: [this.repository.split('/')[1]], permissions: {
        checks: 'write', issues: 'read', pull_requests: 'read', metadata: 'read',
      } }, jwt);
    if (typeof result.token !== 'string' || !Number.isFinite(Date.parse(result.expires_at))) {
      throw new Error('Invalid installation-token response');
    }
    this.cachedToken = result.token;
    this.tokenExpiry = Date.parse(result.expires_at) - 60000;
    return this.cachedToken;
  }
  async get(path) { return this.request('GET', `/repos/${this.repository}${path}`, undefined, await this.token()); }
  async post(path, body) { return this.request('POST', `/repos/${this.repository}${path}`, body, await this.token()); }
  async list(path) {
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await this.get(path + (path.includes('?') ? '&' : '?') + `per_page=100&page=${page}`);
      if (!Array.isArray(result)) throw new Error('Expected paginated GitHub array');
      all.push(...result);
      if (result.length < 100) return all;
    }
    throw new Error('Pagination overflow; fail closed rather than omit overlapping PRs');
  }
  async openPulls() { return this.list('/pulls?state=open'); }
  async pull(number) { return this.get('/pulls/' + number); }
  async files(number) {
    const paths = new Set();
    for (const file of await this.list(`/pulls/${number}/files`)) {
      const names = file?.status === 'renamed'
        ? [file.previous_filename, file.filename]
        : [file?.filename];
      for (const path of names) {
        if (typeof path !== 'string' || !path || path.startsWith('/'))
          throw new Error('Invalid GitHub changed-file metadata.');
        paths.add(path);
      }
    }
    return [...paths];
  }
  async issue(number) { return this.get(`/issues/${number}`); }
  async startCheck(sha) {
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Invalid commit SHA');
    const check = await this.post('/check-runs', {
      name: CHECK_NAME, head_sha: sha, status: 'in_progress',
    });
    if (!Number.isSafeInteger(check?.id) || check.id <= 0)
      throw new Error('Missing governance check run ID');
    return check.id;
  }
  async finishCheck(id, errors) {
    const summary = errors.length ? errors.map(x => `- ${x}`).join('\n').slice(0, 60000) :
      'Task claim, branch ownership, protected paths, reservations and open-PR overlap verified against live GitHub metadata by a separately hosted GitHub App. No PR code executed.';
    return this.request('PATCH', `/repos/${this.repository}/check-runs/${id}`, {
      status: 'completed',
      conclusion: errors.length ? 'failure' : 'success',
      output: { title: errors.length ? 'Governance policy rejected' : 'Trusted governance accepted', summary },
    }, await this.token());
  }
}

function samePullInputs(pr, current) {
  return current?.state === 'open' && current.head?.sha === pr.head?.sha &&
    current.head?.ref === pr.head?.ref &&
    current.head?.repo?.full_name === pr.head?.repo?.full_name &&
    current.base?.ref === pr.base?.ref && current.base?.sha === pr.base?.sha &&
    current.body === pr.body;
}

/**
 * Re-evaluate every open PR, not only the webhook's PR. This invalidates stale
 * passes after a task issue is closed, a competing PR opens, or base moves.
 * Serial execution in server.mjs avoids concurrent stale success overwrites.
 */
async function collectDecisions(client, pulls) {
  const snapshots = [];
  for (const item of pulls) {
    // Always GET current PR metadata; webhook payload is never authorization.
    const pr = await client.pull(item.number);
    if (pr.state !== 'open' || pr.base?.ref !== DEVELOPMENT) continue;
    const files = await client.files(pr.number);
    snapshots.push({ pr, files });
  }
  const fresh = new Map((await client.openPulls())
    .filter(pr => pr.base?.ref === DEVELOPMENT).map(pr => [pr.number, pr]));
  if (fresh.size !== snapshots.length ||
      snapshots.some(({ pr }) => !samePullInputs(pr, fresh.get(pr.number)))) {
    const changed = new Set([...snapshots.map(({ pr }) => pr.number), ...fresh.keys()]);
    return [...changed].map(number => ({
      number, skipped: true, reason: 'Open PR inputs changed during evaluation',
    }));
  }
  const outcomes = [];
  for (const { pr, files } of snapshots) {
    const current = await client.pull(pr.number);
    if (!samePullInputs(pr, current)) {
      outcomes.push({ number: pr.number, skipped: true, reason: 'PR changed during evaluation' });
      continue;
    }
    // Task ownership can change without a PR update. Read it before deciding.
    const task = taskIssueNumber(current.body || '');
    let issue = null;
    if (task) {
      try { issue = await client.issue(task); }
      catch (error) {
        // 404: invalid claim; other API errors cause a failure, not an approval.
        if (!/HTTP 404$/.test(String(error))) throw error;
      }
    }
    const others = snapshots.filter(o => o.pr.number !== pr.number).map(o => ({
      number: o.pr.number, base: o.pr.base.ref, files: o.files,
    }));
    const errors = validatePolicy({
      number: pr.number, head: pr.head.ref, headRepo: pr.head.repo?.full_name,
      base: pr.base.ref, body: pr.body || '', files, issue, openPulls: others,
    });
    outcomes.push({ number: pr.number, sha: pr.head.sha, ok: errors.length === 0, errors });
  }
  return outcomes;
}

export async function evaluateOpenPulls(client, lastKnownHeads = new Set()) {
  let pulls;
  try {
    pulls = (await client.openPulls()).filter(p => p.base?.ref === DEVELOPMENT);
  } catch (error) {
    // Reading PRs and writing checks can fail independently. Do not keep known
    // approvals current when only the metadata endpoint is unavailable.
    for (const sha of lastKnownHeads) {
      try {
        await client.finishCheck(await client.startCheck(sha), unavailable);
      } catch { /* /readyz will report the scan failure. */ }
    }
    throw error;
  }
  const heads = new Set(pulls.filter(pr => pr.head?.repo?.full_name === REPOSITORY)
    .map(pr => pr.head.sha));
  lastKnownHeads.clear();
  for (const sha of heads) lastKnownHeads.add(sha);
  const pending = new Map();
  try {
    // The check is commit-scoped. Every PR sharing the SHA contributes to its decision.
    for (const sha of heads) pending.set(sha, await client.startCheck(sha));
    const decisions = await collectDecisions(client, pulls);
    const byNumber = new Map(decisions.map(decision => [decision.number, decision]));
    const incomplete = decisions.some(decision => decision.skipped);
    for (const [sha, id] of pending) {
      const errors = pulls.filter(pr => pr.head?.sha === sha).flatMap(pr => {
        const decision = byNumber.get(pr.number);
        if (incomplete || decision?.sha !== sha)
          return [`PR #${pr.number} changed during governance evaluation. Await a fresh scan.`];
        return decision.errors.map(error => `PR #${pr.number}: ${error}`);
      });
      await client.finishCheck(id, errors);
      pending.delete(sha);
    }
    return decisions;
  } catch (error) {
    await Promise.allSettled([...pending.values()].map(async id => {
      await client.finishCheck(id, unavailable);
    }));
    throw error;
  }
}
