/**
 * Skyinnk development PR governance gate. No deployment credentials required.
 * This job uses the read-only GitHub token and runs inside Development CI.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEV_BRANCH = 'development/v1-public-launch';
const REPOSITORY = 'codewptech/skyinnk';
const WORKSTREAM = { chat03: 'Chat 03', work: 'Work', chat01: 'Chat 01' };
const TICK = String.fromCharCode(96);
export function changedPaths(files) {
  const paths = new Set();
  for (const file of files) {
    const names = file?.status === 'renamed'
      ? [file.previous_filename, file.filename]
      : [file?.filename];
    for (const path of names) {
      if (typeof path !== 'string' || !path || path.startsWith('/')) {
        throw new Error('Invalid GitHub changed-file metadata.');
      }
      paths.add(path);
    }
  }
  return [...paths];
}

export function roleForBranch(branch) {
  const match = /^(chat03|work|chat01)\/task-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(branch);
  return match?.[1] ?? null;
}

export function taskIssueNumber(body = '') {
  const claims = [...body.matchAll(/^Task issue:[ \t]*#([1-9]\d*)[ \t]*\r?$/gim)];
  const number = Number(claims[0]?.[1]);
  return claims.length === 1 && Number.isSafeInteger(number) ? number : 0;
}

export function reservedPaths(issueBody = '') {
  const section = /^###?\s+Reserved shared paths[^\n]*\n([\s\S]*?)(?=^#{2,3}\s|$(?![\s\S]))/im.exec(issueBody)?.[1];
  if (!section) return new Set();
  return new Set([...section.matchAll(/^\s*-\s*\x60([^\x60]+)\x60\s*$/gm)].map(m => m[1]));
}

export function isSharedPath(path) {
  return /^(?:nuxt\.config\.ts|package(?:-lock)?\.json|app\/app\.vue|README\.md|AGENTS\.md|\.github\/workflows\/|\.github\/pull_request_template\.md|\.github\/ISSUE_TEMPLATE\/|docs\/releases\/|docs\/governance\/|docs\/architecture\/|scripts\/verify-pr-governance\.mjs|scripts\/check\.mjs|scripts\/validate-public-content\.ts|tests\/(?:routes|http|core|governance)\.test\.mjs)/.test(path);
}

function isGovernanceOwnedPath(path) {
  return path === 'AGENTS.md'
    || path === '.github/pull_request_template.md'
    || path.startsWith('.github/ISSUE_TEMPLATE/')
    || path.startsWith('docs/governance/')
    || path.startsWith('docs/architecture/')
    || path === 'scripts/verify-pr-governance.mjs'
    || path === 'tests/governance.test.mjs';
}

export function validatePolicy({ number, head, headRepo, base, body = '', files = [], issue = null, openPulls = [] }) {
  const errors = [];
  if (base !== DEV_BRANCH) errors.push('Base branch must be ' + DEV_BRANCH + '.');
  if (headRepo !== REPOSITORY) errors.push('Head must be an internal feature branch in this repository.');
  const role = roleForBranch(head);
  if (!role) errors.push('Feature branch must be chat03/task-*, work/task-* or chat01/task-* (got ' + head + ').');
  const task = taskIssueNumber(body);
  if (!task) errors.push('PR body must include a line: Task issue: #NUMBER.');
  if (!issue || issue.number !== task || issue.state !== 'open' || issue.pull_request) {
    errors.push('Task issue #' + (task || '?') + ' must be an open issue in this repository.');
  }
  const claimBody = issue?.body || '';
  if (role && !claimBody.split('\n').some(line => line.trim().toLowerCase() === ('Workstream: ' + WORKSTREAM[role]).toLowerCase())) {
    errors.push('Task issue must declare Workstream: ' + WORKSTREAM[role] + '.');
  }
  if (!claimBody.split('\n').some(line => line.trim() === 'Branch: ' + TICK + head + TICK)) {
    errors.push('Task issue must declare Branch: ' + TICK + head + TICK + '.');
  }
  const reserved = reservedPaths(claimBody);
  for (const path of files) {
    if (role && role !== 'chat01' && isGovernanceOwnedPath(path)) {
      errors.push('Governance-owned file ' + path + ' requires a Chat 01-owned governance task/PR.');
    }
    if (role === 'work' &&
      (/^(server\/|prisma\/|app\/middleware\/|\.github\/workflows\/|security\/trusted-governance\/|docs\/security\/)/.test(path)
      || ['scripts/check.mjs', 'docs/releases/V1-RELEASE-STATE.md', 'tests/trusted-governance.test.mjs'].includes(path))) {
      errors.push('Work may not change technical/backend-owned file: ' + path + '. Create a coordinated Chat 03 task.');
    }
    if (role === 'chat01' && !isGovernanceOwnedPath(path) && path !== '.github/workflows/development-ci.yml') {
      errors.push('Chat 01 is governance/architecture-only; not allowed to change: ' + path + '.');
    }
    if (role === 'chat03' && (/^app\/pages\//.test(path) || /^app\/components\/classroom\//.test(path)) && !reserved.has(path)) {
      errors.push('Chat 03 editing Work-owned UI requires an explicit reserved path: ' + path + '.');
    }
    if (isSharedPath(path) && !reserved.has(path)) {
      errors.push('Shared file ' + path + ' must be reserved by exact path in the task issue.');
    }
  }
  const owned = new Set(files);
  for (const other of openPulls) {
    if (other.number === number || other.base !== DEV_BRANCH) continue;
    const collisions = [...new Set(other.files || [])].filter(path => owned.has(path));
    if (collisions.length) errors.push('Files overlap with open PR #' + other.number + ': ' + collisions.join(', ') + '. Coordinate integration.');
  }
  return errors;
}

export function assertEventRevision(eventPull, current) {
  if (current.state !== 'open' ||
      current.head?.sha !== eventPull.head?.sha ||
      current.base?.sha !== eventPull.base?.sha ||
      current.base?.ref !== eventPull.base?.ref ||
      current.head?.ref !== eventPull.head?.ref ||
      current.head?.repo?.full_name !== eventPull.head?.repo?.full_name) {
    throw new Error('PR revision changed. Run Development CI for the current revision.');
  }
}

async function enforceFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!eventPath || !token || !/^[-\w.]+\/[-\w.]+$/.test(repository || '')) {
    throw new Error('GITHUB_EVENT_PATH, GITHUB_TOKEN and valid GITHUB_REPOSITORY required.');
  }
  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  const eventPull = event.pull_request;
  if (!Number.isSafeInteger(eventPull?.number)) throw new Error('PR governance must run on pull_request.');
  const api = async path => {
    const response = await fetch('https://api.github.com/repos/' + repository + path, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('GitHub API GET ' + path + ': HTTP ' + response.status);
    return response.json();
  };
  const collect = async path => {
    const all = [];
    for (let page = 1; page <= 20; page++) {
      const values = await api(path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
      if (!Array.isArray(values)) throw new Error('Unexpected GitHub API list response.');
      all.push(...values);
      if (values.length < 100) return all;
    }
    throw new Error('GitHub API list pagination limit exceeded.');
  };
  const pullPath = '/pulls/' + eventPull.number;
  const files = changedPaths(await collect(pullPath + '/files'));
  const others = await collect('/pulls?state=open');
  const openPulls = [];
  for (const other of others) {
    if (other.number === eventPull.number || other.base?.ref !== DEV_BRANCH) continue;
    openPulls.push({ number: other.number, base: other.base.ref,
      files: changedPaths(await collect('/pulls/' + other.number + '/files')) });
  }
  const pr = await api(pullPath);
  assertEventRevision(eventPull, pr);
  const task = taskIssueNumber(pr.body || '');
  const issue = task ? await api('/issues/' + task) : null;
  const errors = validatePolicy({
    number: pr.number, head: pr.head.ref, headRepo: pr.head.repo?.full_name,
    base: pr.base.ref, body: pr.body || '',
    files, issue, openPulls,
  });
  for (const error of errors) console.error('::error::' + error.replace(/\r?\n/g, ' '));
  if (errors.length) throw new Error(errors.length + ' governance violation(s); see https://github.com/' + repository + '/issues/2.');
  console.log('PR #' + pr.number + ' passed workstream, task-ownership, shared-file and overlap checks.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  enforceFromEvent().catch(error => { console.error(error); process.exitCode = 1; });
}
