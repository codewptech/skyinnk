/**
 * Skyinnk development PR governance gate. No deployment credentials required.
 * This job uses the read-only GitHub token and runs inside Development CI.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { field, parsePacket, section, validateGraph, validatePacket } from '../docs/governance/parallel-task-policy.mjs';

const DEV_BRANCH = 'development/v1-public-launch';
const REPOSITORY = 'codewptech/skyinnk';
const WORKSTREAM = { chat03: 'Chat 03', work: 'Work', chat01: 'Chat 01' };
const TICK = String.fromCharCode(96);
const LAST_LEGACY_ISSUE = 43;
const ACTIONS_APP_ID = 15368;
const SHA = /^[0-9a-f]{40}$/;
const PR_STATES = new Set(['PR_OPEN', 'REVIEWING', 'READY_TO_INTEGRATE', 'INTEGRATING']);
const CLAIM_STATES = new Set(['CLAIMED', 'BUILDING', 'PAUSED', 'BLOCKED', 'CHANGES_REQUESTED', ...PR_STATES]);

function isPeaIssue(issue) {
  return Number.isSafeInteger(issue?.number) && issue.number > LAST_LEGACY_ISSUE && !issue.pull_request;
}

function declaredExecutor(packet) {
  return Boolean(packet.executor) && !/^(?:unclaimed|unassigned|none|pending|unknown|n\/a)$/i.test(packet.executor);
}
export function changedPaths(files) {
  const paths = new Set();
  for (const file of files) {
    const names = file?.status === 'renamed'
      ? [file.previous_filename, file.filename]
      : [file?.filename];
    for (const path of names) {
      if (typeof path !== 'string' || /[\x00-\x1f\x7f\\]/.test(path) ||
          path.split('/').some(part => !part || part === '.' || part === '..')) {
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
  if (current.state !== 'open' || current.number !== eventPull.number ||
      current.head?.sha !== eventPull.head?.sha ||
      current.base?.sha !== eventPull.base?.sha ||
      current.base?.ref !== eventPull.base?.ref ||
      current.head?.ref !== eventPull.head?.ref ||
      current.head?.repo?.full_name !== eventPull.head?.repo?.full_name) {
    throw new Error('PR revision changed. Run Development CI for the current revision.');
  }
}

export async function readPullFiles(pr, collect) {
  const files = await collect('/pulls/' + pr.number + '/files');
  if (!Number.isSafeInteger(pr.changed_files) || !Array.isArray(files) ||
      files.length !== pr.changed_files || new Set(files.map(file => file?.filename)).size !== files.length) {
    throw new Error('Incomplete GitHub changed-file evidence for PR #' + pr.number + '.');
  }
  return changedPaths(files);
}

function targetPulls(pulls, currentNumber) {
  return pulls.filter(pr => pr.number !== currentNumber && pr.base?.ref === DEV_BRANCH)
    .sort((a, b) => a.number - b.number);
}

export function assertOpenPullSnapshot(before, after, currentNumber) {
  const snapshot = pulls => targetPulls(pulls, currentNumber).map(pr => [pr.number, pr.state,
    pr.head?.sha, pr.head?.repo?.full_name, pr.base?.sha]);
  if (JSON.stringify(snapshot(before)) !== JSON.stringify(snapshot(after))) {
    throw new Error('Competing development PRs changed during validation. Re-run Development CI.');
  }
}

// GitHub issues and PRs share a number space. START references must be issues.
// Follow hard edges for cycle detection and resolve SOFT references without
// using their completion state to block work.
async function readDependencyGraph(issue, packet, api) {
  const nodes = new Map([[issue.number, issue]]);
  const packets = new Map([[issue.number, packet]]);
  const queue = [{ number: issue.number, packet }];
  const errors = [];
  for (const task of queue) {
    const hard = new Set([...task.packet.start, ...task.packet.integration]);
    for (const number of new Set([...hard, ...task.packet.soft])) {
      if (!nodes.has(number)) {
        const node = await api('/issues/' + number);
        if (node?.number !== number) throw new Error('GitHub returned the wrong dependency for #' + number);
        nodes.set(number, node);
      }
      const node = nodes.get(number);
      if (!hard.has(number) || !isPeaIssue(node) || packets.has(number)) continue;
      const upstream = parsePacket(node.body);
      packets.set(number, upstream);
      const invalid = validatePacket(upstream, { number });
      errors.push(...invalid.map(error => 'Dependency #' + number + ': ' + error));
      if (invalid.length === 0) queue.push({ number, packet: upstream });
    }
  }
  const tasks = [...nodes.values()].filter(node => !node.pull_request)
    .map(node => ({ number: node.number, packet: packets.get(node.number) ?? {} }));
  const knownPullRequests = [...nodes.values()].filter(node => node.pull_request).map(node => node.number);
  return { nodes, packets, errors: [...errors, ...validateGraph(tasks, { knownPullRequests })] };
}

async function verifiedDevelopmentMerge(pr, baseSha, api) {
  const merge = pr.merge_commit_sha;
  if (pr.merged !== true || pr.base?.ref !== DEV_BRANCH || pr.base.repo?.full_name !== REPOSITORY ||
      !SHA.test(merge ?? '') || !SHA.test(baseSha ?? '')) return false;
  const page = await api('/commits/' + merge + '/check-runs?filter=all&per_page=100');
  if (!Array.isArray(page?.check_runs) || page.total_count !== page.check_runs.length) {
    throw new Error('Incomplete GitHub check evidence for ' + merge);
  }
  const latest = page.check_runs.filter(run => run.name === 'Development CI' && run.app?.id === ACTIONS_APP_ID &&
    run.head_sha === merge).sort((a, b) => b.id - a.id)[0];
  if (latest?.status !== 'completed' || latest.conclusion !== 'success') return false;
  const runLink = /^https:\/\/github\.com\/codewptech\/skyinnk\/actions\/runs\/([1-9]\d*)\/job\/([1-9]\d*)$/.exec(latest.details_url ?? '');
  if (!runLink || runLink[2] !== String(latest.id)) return false;
  const run = await api('/actions/runs/' + runLink[1]);
  if (String(run?.id) !== runLink[1] || run.event !== 'push' || run.head_sha !== merge || run.head_branch !== DEV_BRANCH ||
      run.path !== '.github/workflows/development-ci.yml' || run.status !== 'completed' || run.conclusion !== 'success') return false;
  if (merge === baseSha) return true;
  const ancestry = await api('/compare/' + merge + '...' + baseSha);
  return ancestry?.status === 'ahead' && ancestry.merge_base_commit?.sha === merge;
}

export async function validatePeaPull({ issue, pr, files, openPulls = [], api, collect }) {
  if (!isPeaIssue(issue)) return [];
  const packet = parsePacket(issue.body);
  const errors = validatePacket(packet, { number: issue.number });
  if (packet.branch !== pr.head.ref || packet.target !== pr.base.ref || packet.workstream !== WORKSTREAM[roleForBranch(pr.head.ref)]) {
    errors.push('PEA-2 claim must match the actual PR workstream, branch and target.');
  }
  if (!PR_STATES.has(packet.state) || (pr.draft && ['READY_TO_INTEGRATE', 'INTEGRATING'].includes(packet.state))) {
    errors.push('PEA-2 task must be in a PR or review state consistent with this pull request.');
  }
  if (!declaredExecutor(packet) || !section(issue.body ?? '', 'Claim lease')) {
    errors.push('PEA-2 task must record the executor and an advisory or lease claim.');
  }
  const claimed = new Set([...packet.owned, ...packet.shared]);
  for (const path of files) {
    if (!claimed.has(path)) errors.push('Changed path outside the PEA-2 claim: ' + path);
  }
  if (errors.length) return errors;

  const graph = await readDependencyGraph(issue, packet, api);
  if (graph.errors.length) return graph.errors;
  let closedPulls;
  for (const number of [...packet.start, ...packet.integration]) {
    const dependency = graph.nodes.get(number);
    let verified = false;
    if (dependency.pull_request) {
      const upstream = await api('/pulls/' + number);
      verified = upstream?.number === number && await verifiedDevelopmentMerge(upstream, pr.base.sha, api);
    } else if (dependency.state === 'closed' && dependency.state_reason === 'completed' &&
        (!isPeaIssue(dependency) || graph.packets.get(number)?.state === 'DONE')) {
      closedPulls ??= await collect('/pulls?state=closed&base=' + encodeURIComponent(DEV_BRANCH));
      const branch = field(dependency.body ?? '', 'Branch').replace(/^`|`$/g, '');
      for (const candidate of closedPulls) {
        if (taskIssueNumber(candidate.body ?? '') !== number || candidate.head?.ref !== branch) continue;
        const upstream = await api('/pulls/' + candidate.number);
        if (upstream?.number === candidate.number && upstream.head?.ref === branch &&
            upstream.head.repo?.full_name === REPOSITORY && taskIssueNumber(upstream.body ?? '') === number &&
            await verifiedDevelopmentMerge(upstream, pr.base.sha, api)) {
          verified = true;
          break;
        }
      }
    }
    if (!verified) errors.push((packet.start.includes(number) ? 'START' : 'INTEGRATION') + ' dependency #' + number + ' has no verified development integration.');
  }

  for (const other of await collect('/issues?state=open')) {
    if (!isPeaIssue(other) || other.number === issue.number) continue;
    const claim = parsePacket(other.body);
    if (!CLAIM_STATES.has(claim.state) || (claim.state === 'BLOCKED' && !declaredExecutor(claim))) continue;
    if (claim.branch === packet.branch || [...claim.owned, ...claim.shared].some(path => claimed.has(path))) {
      errors.push('PEA-2 task claim conflicts with issue #' + other.number + '.');
    }
  }
  for (const other of openPulls) {
    if (other.number !== pr.number && other.base === DEV_BRANCH && other.files.some(path => claimed.has(path))) {
      errors.push('PEA-2 task claim overlaps open PR #' + other.number + '.');
    }
  }
  return errors;
}

async function enforceFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!eventPath || !token || repository !== REPOSITORY) {
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
  const [pr, others] = await Promise.all([api(pullPath), collect('/pulls?state=open')]);
  assertEventRevision(eventPull, pr);
  const files = await readPullFiles(pr, collect);
  const openPulls = [];
  for (const other of targetPulls(others, pr.number)) {
    const current = await api('/pulls/' + other.number);
    if (current.number !== other.number || current.state !== 'open' || current.base?.ref !== DEV_BRANCH ||
        current.head?.sha !== other.head?.sha || current.head?.repo?.full_name !== other.head?.repo?.full_name) {
      throw new Error('Competing development PR #' + other.number + ' changed during validation. Re-run Development CI.');
    }
    openPulls.push({ number: other.number, base: other.base.ref, files: await readPullFiles(current, collect) });
  }
  const task = taskIssueNumber(pr.body || '');
  const issue = task ? await api('/issues/' + task) : null;
  const errors = validatePolicy({
    number: pr.number, head: pr.head.ref, headRepo: pr.head.repo?.full_name,
    base: pr.base.ref, body: pr.body || '',
    files, issue, openPulls,
  });
  if (!errors.length && isPeaIssue(issue)) {
    errors.push(...await validatePeaPull({ issue, pr, files, openPulls, api, collect }));
  }
  if (!errors.length) {
    const [latestPr, latestIssue, latestOthers] = await Promise.all([
      api(pullPath), api('/issues/' + task), collect('/pulls?state=open'),
    ]);
    assertEventRevision(eventPull, latestPr);
    assertOpenPullSnapshot(others, latestOthers, pr.number);
    if (latestPr.body !== pr.body || latestPr.draft !== pr.draft || latestPr.changed_files !== pr.changed_files ||
        latestIssue.number !== issue.number || latestIssue.state !== issue.state || latestIssue.body !== issue.body ||
        latestIssue.updated_at !== issue.updated_at) {
      errors.push('PR or task metadata changed during validation. Re-run Development CI.');
    }
  }
  for (const error of errors) console.error('::error::' + error.replace(/\r?\n/g, ' '));
  if (errors.length) throw new Error(errors.length + ' governance violation(s); see https://github.com/' + repository + '/issues/2.');
  console.log('PR #' + pr.number + ' passed workstream, task-ownership, shared-file and overlap checks.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  enforceFromEvent().catch(error => { console.error(error); process.exitCode = 1; });
}
