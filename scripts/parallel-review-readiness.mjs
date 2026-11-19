/**
 * Skyinnk PEA-2: read-only development PR integration readiness scanner.
 * Never merges, approves, writes to GitHub, or deploys.
 * Usage: GH_TOKEN=read-only-token node scripts/parallel-review-readiness.mjs --repo owner/repo
 */
import { pathToFileURL } from 'node:url';

export const DEV_BRANCH = 'development/v1-public-launch';
export const REQUIRED_CHECK = 'Development CI';
const ACTIONS_APP_ID = 15368;
const SHA = /^[a-f0-9]{40}$/;
const BRANCH_POLICY = new Map([
  ['chat01', 'Chat 01'], ['chat03', 'Chat 03'], ['work', 'Work']
]);

function issueBranch(body) {
  const matches = [...(body ?? '').matchAll(/^Branch:[ \t]*`([^`\r\n]+)`[ \t]*$/gm)];
  return matches.length === 1 ? matches[0][1] : null;
}

function taskMatchesPR(issue, pr, task) {
  if (issue?.number !== task || issue.state !== 'open' || issue.pull_request ||
      typeof pr.head.ref !== 'string' || issueBranch(issue.body) !== pr.head.ref) return false;
  const prefix = /^(chat01|chat03|work)\/task-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(pr.head.ref)?.[1];
  const workstream = [...(issue.body ?? '').matchAll(/^Workstream:[ \t]*([^\r\n]+)$/gm)];
  return Boolean(prefix && workstream.length === 1 &&
    workstream[0][1].trim() === BRANCH_POLICY.get(prefix));
}

export function taskNumber(body = '') {
  const declarations = body.split(/\r?\n/).filter(line => /^Task issue:/i.test(line));
  if (declarations.length !== 1) return null;
  const match = /^Task issue:[ \t]*#([1-9]\d*)[ \t]*$/i.exec(declarations[0]);
  const number = Number(match?.[1]);
  return Number.isSafeInteger(number) ? number : null;
}

export function touchedPaths(files = []) {
  const paths = new Set();
  for (const file of files) {
    const names = file.status === 'renamed'
      ? [file.previous_filename, file.filename] : [file.filename];
    for (const name of names) {
      if (typeof name !== 'string' || !name || name.startsWith('/') ||
          name.includes('\\') || /[\x00-\x1f\x7f]/.test(name) ||
          name.split('/').some(part => part === '' || part === '.' || part === '..')) {
        throw new Error('Unsafe or incomplete changed-file metadata');
      }
      paths.add(name);
    }
  }
  return [...paths].sort();
}

export function assessPullRequests({ pullRequests, developmentSha, requiredCheck = REQUIRED_CHECK, requiredAppId = ACTIONS_APP_ID }) {
  if (!SHA.test(developmentSha)) throw new Error('Invalid development commit SHA');
  if (!Array.isArray(pullRequests)) throw new Error('Missing PR collection');
  const active = pullRequests.filter(p => p.base?.ref === DEV_BRANCH && p.state === 'open');
  const owners = new Map();
  const results = active.map(pr => {
    if (!Number.isInteger(pr.number) || pr.number <= 0 ||
        !SHA.test(pr.head?.sha ?? '')) {
      throw new Error('Invalid pull request number/head');
    }
    if (!Array.isArray(pr.files) || !Array.isArray(pr.checks) || !Array.isArray(pr.reviews)) {
      throw new Error('Incomplete evidence for PR #' + pr.number);
    }
    const paths = touchedPaths(pr.files);
    for (const path of paths) {
      if (!owners.has(path)) owners.set(path, []);
      owners.get(path).push(pr.number);
    }
    const checks = pr.checks.filter(c =>
      c.name === requiredCheck && c.head_sha === pr.head.sha && c.app?.id === requiredAppId);
    const validCheckIds = checks.every(c => Number.isSafeInteger(c.id) && c.id > 0) &&
      new Set(checks.map(c => c.id)).size === checks.length;
    const check = validCheckIds ? checks.sort((a, b) => b.id - a.id)[0] : undefined;
    const ciPassed = check?.status === 'completed' && check.conclusion === 'success';
    // Approval metadata is useful evidence, but shared credentials are not independent human identity.
    // Only the latest decision by a reviewer is relevant; later requests for
    // changes invalidate an earlier approval at the same PR head.
    const latestByReviewer = new Map();
    for(const review of pr.reviews.filter(r => ['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(r.state))){
      if (review.user?.login) latestByReviewer.set(review.user.login.toLowerCase(), review);
    }
    const submitted = [...latestByReviewer.values()].filter(r =>
      r.state === 'APPROVED' && r.commit_id === pr.head.sha &&
      r.user?.type === 'User' && pr.user?.login &&
      r.user.login.toLowerCase() !== pr.user.login.toLowerCase());
    const task = taskNumber(pr.body || '');
    const reasons = [];
    if (pr.base.sha !== developmentSha || pr.baseIncluded !== true) reasons.push('BASE_STALE');
    if (!ciPassed) reasons.push('CI_UNVERIFIED');
    if (!submitted.length) reasons.push('REVIEW_MISSING');
    if (!task) reasons.push('TASK_ISSUE_MISSING');
    else if (pr.taskVerified !== true) reasons.push('TASK_ISSUE_UNVERIFIED');
    if (pr.dependenciesVerified !== true) reasons.push('DEPENDENCIES_UNVERIFIED');
    if ([...latestByReviewer.values()].some(r => r.state === 'CHANGES_REQUESTED')) {
      reasons.push('CHANGES_REQUESTED');
    }
    if (pr.draft !== false) reasons.push('DRAFT_OR_UNVERIFIED');
    if (pr.mergeable !== true) reasons.push('MERGEABILITY_UNVERIFIED');
    return {number: pr.number, title: pr.title, head: pr.head.sha,
      base: pr.base.sha, task, paths, ci: ciPassed, checkId: check?.id ?? null,
      submittedApprovals: submitted.length, reasons};
  });
  for (const result of results) {
    const conflicts = [...new Set(result.paths.flatMap(path =>
      (owners.get(path) || []).filter(n => n !== result.number)))].sort((a,b) => a-b);
    if (conflicts.length) result.reasons.push('FILE_OVERLAP');
    result.conflictingPRs = conflicts;
    result.status = result.reasons.length
      ? 'REVIEW_OR_RECONCILE' : 'CANDIDATE_FOR_HUMAN_MERGE_CHECK';
  }
  results.sort((a,b) => {
    const cost = x => (x.reasons.includes('FILE_OVERLAP') ? 100 : 0) +
      (x.reasons.includes('BASE_STALE') ? 20 : 0) +
      (x.reasons.includes('CI_UNVERIFIED') ? 10 : 0) +
      (x.reasons.includes('REVIEW_MISSING') ? 5 : 0);
    return cost(a) - cost(b) || a.number - b.number;
  });
  return {
    developmentSha, total: results.length,
    candidates: results.filter(x => x.status === 'CANDIDATE_FOR_HUMAN_MERGE_CHECK').length,
    pendingReview: results.filter(x => x.reasons.includes('REVIEW_MISSING')).length,
    overlapping: results.filter(x => x.reasons.includes('FILE_OVERLAP')).length,
    pullRequests: results
  };
}

export function createReadOnlyClient({ repository, token, apiFetch = fetch, endpoint = 'https://api.github.com' }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  if (typeof apiFetch !== 'function') throw new Error('Missing fetch implementation');
  const root = '/repos/' + repository;
  const get = async (path, {allowMissing = false} = {}) => {
    if (!path.startsWith('/') || /[\\#]|%/i.test(path) ||
        path.split('?')[0].split('/').some(part => part === '.' || part === '..')) {
      throw new Error('Unsafe API path');
    }
    const response = await apiFetch(endpoint + root + path, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? {Authorization: 'Bearer ' + token} : {})
      },
      signal: AbortSignal.timeout(20000)
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error('GitHub GET failed: HTTP ' + response.status + ' ' + path);
    return response.json();
  };
  const collect = async path => {
    const all = [];
    for (let page = 1; page <= 10; page++) {
      const url = path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page;
      const items = await get(url);
      if (!Array.isArray(items)) throw new Error('GitHub collection was not an array');
      all.push(...items);
      if (items.length < 100) return all;
    }
    throw new Error('GitHub pagination limit exceeded');
  };
  return {get, collect};
}

export async function inspectRepository({ repository, token, apiFetch = fetch }) {
  const api = createReadOnlyClient({repository,token,apiFetch});
  const [branch, openPRs] = await Promise.all([
    api.get('/branches/' + DEV_BRANCH),
    api.collect('/pulls?state=open')
  ]);
  const developmentSha = branch.commit?.sha;
  if (!SHA.test(developmentSha ?? '')) throw new Error('Invalid development commit SHA');
  const targets = openPRs.filter(p => p.base?.ref === DEV_BRANCH);
  const details = [];
  for (const listed of targets) {
    if (!Number.isSafeInteger(listed.number) || listed.number <= 0 ||
        !SHA.test(listed.head?.sha ?? '')) throw new Error('Invalid listed PR identity');
    const route = '/pulls/' + listed.number;
    const pr = await api.get(route);
    if (pr.number !== listed.number || pr.state !== 'open' ||
        pr.base?.ref !== DEV_BRANCH || pr.base.sha !== developmentSha ||
        pr.head?.sha !== listed.head.sha) throw new Error('PR changed during scan: ' + route);
    const task = taskNumber(pr.body ?? '');
    const sameRepository = [pr.base.repo?.full_name, pr.head.repo?.full_name]
      .every(name => name?.toLowerCase() === repository.toLowerCase());
    const [files, checkPage, reviews, comparison, issue] = await Promise.all([
      api.collect(route + '/files'),
      api.get('/commits/' + pr.head.sha + '/check-runs?filter=all&per_page=100'),
      api.collect(route + '/reviews'),
      api.get('/compare/' + developmentSha + '...' + pr.head.sha),
      task ? api.get('/issues/' + task, {allowMissing: true}) : null
    ]);
    if (files.length !== pr.changed_files || !Array.isArray(checkPage.check_runs) ||
        checkPage.total_count !== checkPage.check_runs.length) {
      throw new Error('Incomplete file or check evidence: ' + route);
    }
    const taskVerified = sameRepository && taskMatchesPR(issue, pr, task);
    // Hard dependencies and external approvals require trusted evidence from policy integration.
    // SOFT dependencies do not block an otherwise reviewable PR.
    const dependencySections = [...(issue?.body ?? '').matchAll(
      /^### Dependencies[ \t]*\r?\n([\s\S]*?)(?=^#{1,3} |(?![\s\S]))/gm
    )];
    const dependenciesVerified = taskVerified && dependencySections.length === 1 &&
      /^\s*- START: none\r?\n- INTEGRATION: none\r?\n- SOFT: (?:none|#[1-9]\d*(?:[ ,]+#[1-9]\d*)*)\r?\n- External approval: none\s*$/i
        .test(dependencySections[0][1]);
    const latest = await api.get(route);
    if (latest.state !== pr.state || latest.head?.sha !== pr.head.sha ||
        latest.base?.sha !== pr.base.sha || latest.updated_at !== pr.updated_at ||
        latest.draft !== pr.draft || latest.mergeable !== pr.mergeable || latest.body !== pr.body) {
      throw new Error('PR changed during scan: ' + route);
    }
    details.push({...pr, files, checks: checkPage.check_runs, reviews, taskVerified,
      dependenciesVerified, baseIncluded: comparison.behind_by === 0 &&
        ['ahead', 'identical'].includes(comparison.status)});
  }
  const latestBranch = await api.get('/branches/' + DEV_BRANCH);
  if (latestBranch.commit?.sha !== developmentSha) {
    throw new Error('Development branch changed during scan');
  }
  return assessPullRequests({pullRequests:details,developmentSha});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--repo');
  const repository = index >= 0 ? process.argv[index+1] : process.env.GITHUB_REPOSITORY;
  inspectRepository({repository,token:process.env.GH_TOKEN || process.env.GITHUB_TOKEN})
    .then(result => {
      console.log(JSON.stringify(result,null,2));
      process.exitCode = result.overlapping ? 2 : 0;
    })
    .catch(error => {
      console.error('Readiness scan failed: ' + error.message);
      process.exitCode = 1;
    });
}
