/**
 * Skyinnk PEA-2: read-only development PR integration readiness scanner.
 * Never merges, approves, writes to GitHub, or deploys.
 * Usage: GH_TOKEN=read-only-token node scripts/parallel-review-readiness.mjs --repo owner/repo
 */
import { pathToFileURL } from 'node:url';

export const DEV_BRANCH = 'development/v1-public-launch';
export const REQUIRED_CHECK = 'Development CI';

export function taskNumber(body = '') {
  const value = /^Task issue:\s*#(\d+)\s*$/im.exec(body)?.[1];
  return value ? Number(value) : null;
}

export function touchedPaths(files = []) {
  const paths = new Set();
  for (const file of files) {
    const names = file.status === 'renamed'
      ? [file.previous_filename, file.filename] : [file.filename];
    for (const name of names) {
      if (typeof name !== 'string' || !name || name.startsWith('/') ||
          name.includes('\\') || /(^|\/)\.\.(\/|$)/.test(name)) {
        throw new Error('Unsafe or incomplete changed-file metadata');
      }
      paths.add(name);
    }
  }
  return [...paths].sort();
}

export function assessPullRequests({ pullRequests, developmentSha, requiredCheck = REQUIRED_CHECK }) {
  if (!/^[a-f0-9]{40}$/i.test(developmentSha)) throw new Error('Invalid development commit SHA');
  if (!Array.isArray(pullRequests)) throw new Error('Missing PR collection');
  const active = pullRequests.filter(p => p.base?.ref === DEV_BRANCH && p.state === 'open');
  const owners = new Map();
  const results = active.map(pr => {
    if (!Number.isInteger(pr.number) || pr.number <= 0 ||
        !/^[a-f0-9]{40}$/i.test(pr.head?.sha || '')) {
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
    const check = pr.checks.find(c =>
      c.name === requiredCheck && c.head_sha === pr.head.sha &&
      c.status === 'completed' && c.conclusion === 'success');
    // Approval metadata is useful evidence, but shared credentials are not independent human identity.
    const submitted = pr.reviews.filter(r =>
      r.state === 'APPROVED' && r.commit_id === pr.head.sha &&
      r.user?.login && r.user.login !== pr.user?.login);
    const task = taskNumber(pr.body || '');
    const reasons = [];
    if (pr.base.sha !== developmentSha) reasons.push('BASE_STALE');
    if (!check) reasons.push('CI_UNVERIFIED');
    if (!submitted.length) reasons.push('REVIEW_MISSING');
    if (!task) reasons.push('TASK_ISSUE_MISSING');
    if (pr.draft) reasons.push('DRAFT');
    return {number: pr.number, title: pr.title, head: pr.head.sha,
      base: pr.base.sha, task, paths, ci: !!check,
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
  const get = async path => {
    if (!path.startsWith('/') || path.includes('..')) throw new Error('Unsafe API path');
    const response = await apiFetch(endpoint + root + path, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? {Authorization: 'Bearer ' + token} : {})
      },
      signal: AbortSignal.timeout(20000)
    });
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
  const targets = openPRs.filter(p => p.base?.ref === DEV_BRANCH);
  const details = await Promise.all(targets.map(async pr => {
    const [files, checks, reviews] = await Promise.all([
      api.collect('/pulls/' + pr.number + '/files'),
      api.get('/commits/' + pr.head.sha + '/check-runs?per_page=100'),
      api.collect('/pulls/' + pr.number + '/reviews')
    ]);
    return {...pr, files, checks: (checks.check_runs || []).map(c => ({
      name:c.name, head_sha:c.head_sha, status:c.status, conclusion:c.conclusion
    })), reviews};
  }));
  return assessPullRequests({pullRequests:details,developmentSha:branch.commit?.sha});
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
