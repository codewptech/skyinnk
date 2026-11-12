import { createPrivateKey, sign, createHmac, timingSafeEqual } from 'node:crypto';
import { CHECK_NAME, DEVELOPMENT, REPOSITORY, taskIssueNumber, validatePolicy } from './policy.mjs';

const API = 'https://api.github.com';
const MAX_PAGES = 20;
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
  async files(number) { return (await this.list(`/pulls/${number}/files`)).map(x => x.filename); }
  async issue(number) { return this.get(`/issues/${number}`); }
  async check(sha, errors) {
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Invalid commit SHA');
    const summary = errors.length ? errors.map(x => `- ${x}`).join('\n').slice(0, 60000) :
      'Task claim, branch ownership, protected paths, reservations and open-PR overlap verified against live GitHub metadata by a separately hosted GitHub App. No PR code executed.';
    return this.post('/check-runs', {
      name: CHECK_NAME,
      head_sha: sha,
      status: 'completed',
      conclusion: errors.length ? 'failure' : 'success',
      output: { title: errors.length ? 'Governance policy rejected' : 'Trusted governance accepted', summary },
    });
  }
}

/**
 * Re-evaluate every open PR, not only the webhook's PR. This invalidates stale
 * passes after a task issue is closed, a competing PR opens, or base moves.
 * Serial execution in server.mjs avoids concurrent stale success overwrites.
 */
export async function evaluateOpenPulls(client) {
  const pulls = (await client.openPulls()).filter(p => p.base?.ref === DEVELOPMENT);
  const snapshots = [];
  for (const item of pulls) {
    // Always GET current PR metadata; webhook payload is never authorization.
    const pr = await client.pull(item.number);
    if (pr.state !== 'open' || pr.base?.ref !== DEVELOPMENT) continue;
    const files = await client.files(pr.number);
    const task = taskIssueNumber(pr.body || '');
    let issue = null;
    if (task) {
      try { issue = await client.issue(task); }
      catch (error) {
        // 404: invalid claim; other API errors cause a failure, not an approval.
        if (!/HTTP 404$/.test(String(error))) throw error;
      }
    }
    snapshots.push({ pr, files, issue });
  }
  const outcomes = [];
  for (const entry of snapshots) {
    const { pr, files, issue } = entry;
    const others = snapshots.filter(o => o.pr.number !== pr.number).map(o => ({
      number: o.pr.number, base: o.pr.base.ref, files: o.files,
    }));
    const errors = validatePolicy({
      number: pr.number, head: pr.head.ref, headRepo: pr.head.repo?.full_name,
      base: pr.base.ref, body: pr.body || '', files, issue, openPulls: others,
    });
    // Fail closed if the head changed during evaluation: new push will need a new check.
    const current = await client.pull(pr.number);
    if (current.state !== 'open' || current.head?.sha !== pr.head?.sha ||
        current.base?.ref !== DEVELOPMENT || current.body !== pr.body) {
      outcomes.push({ number: pr.number, skipped: true, reason: 'PR changed during evaluation; scheduled next pass' });
      continue;
    }
    await client.check(pr.head.sha, errors);
    outcomes.push({ number: pr.number, sha: pr.head.sha, ok: errors.length === 0, errors });
  }
  return outcomes;
}
