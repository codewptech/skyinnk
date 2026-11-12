/**
 * Trusted metadata-only PR policy for the separately installed Skyinnk GitHub App.
 * This module MUST run from a pinned, owner-approved service image, not PR source.
 * No PR content or executable workflow is fetched, loaded or executed.
 */
export const DEVELOPMENT = 'development/v1-public-launch';
export const CHECK_NAME = 'Skyinnk Trusted Governance';
export const REPOSITORY = 'codewptech/skyinnk';

const ROLE = { chat01: 'Chat 01', chat03: 'Chat 03', work: 'Work' };
const TICK = String.fromCharCode(96);
const LEGACY_BRANCH = 'work/v1-public-learning-integration';
// Immutable metadata-only exception for pre-protocol PR #1; never allow new paths.
export const LEGACY_FILES = new Set([
  '.dockerignore', 'README.md', 'app/app.vue', 'app/components/LegalPage.vue',
  'app/components/MarkdownNotes.vue', 'app/components/classroom/Syllabus.vue',
  'app/pages/courses/[courseSlug]/index.vue',
  'app/pages/courses/[courseSlug]/lessons/[lessonSlug].vue',
  'app/pages/courses/index.vue', 'app/pages/index.vue',
  'app/utils/public-catalogue.ts', 'app/utils/render-markdown.ts',
  'content/catalogue.json', 'docs/releases/V1-CONTENT-INTAKE.md',
  'docs/releases/V1-INTEGRATION-HANDOFF.md', 'docs/releases/V1-RELEASE-STATE.md',
  'docs/releases/V1-REVIEW.md', 'docs/releases/V1-TECHNICAL-BACKLOG.md',
  'nuxt.config.ts', 'package-lock.json', 'package.json', 'public/robots.txt',
  'scripts/smoke-v1.mjs', 'scripts/validate-public-content.ts',
  'server/routes/sitemap.xml.get.ts', 'shared/public-content.ts',
  'tests/fixtures/public-catalogue.mjs', 'tests/markdown.test.mjs',
  'tests/routes.test.mjs', 'tests/v1-content.test.mjs',
]);

export function roleForBranch(branch) {
  return /^(chat01|chat03|work)\/task-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(branch)?.[1] ?? null;
}
export function taskIssueNumber(body = '') {
  return Number(/^Task issue:\s*#([1-9]\d*)\s*$/im.exec(body)?.[1] ?? 0);
}
export function reservedPaths(issueBody = '') {
  const m = /^###?\s+Reserved shared paths[^\n]*\n([\s\S]*?)(?=^#{2,3}\s|$(?![\s\S]))/im.exec(issueBody);
  return new Set([...(m?.[1] || '').matchAll(/^\s*-\s*`([^`]+)`\s*$/gm)].map(x => x[1]));
}
export function isShared(path) {
  return /^(?:nuxt\.config\.ts|package(?:-lock)?\.json|app\/app\.vue|README\.md|AGENTS\.md|\.github\/workflows\/|\.github\/pull_request_template\.md|\.github\/ISSUE_TEMPLATE\/|docs\/releases\/|docs\/governance\/|docs\/architecture\/|scripts\/(?:verify-pr-governance|check|validate-public-content)\.mjs|scripts\/validate-public-content\.ts|tests\/(?:routes|http|core|governance)\.test\.mjs)/.test(path);
}
export function isGovernance(path) {
  return path === 'AGENTS.md' || path === '.github/pull_request_template.md' ||
    path.startsWith('.github/ISSUE_TEMPLATE/') ||
    path.startsWith('docs/governance/') || path.startsWith('docs/architecture/') ||
    path === 'scripts/verify-pr-governance.mjs' || path === 'tests/governance.test.mjs';
}
function chat01Allowed(path) {
  return isGovernance(path) || path === '.github/workflows/development-ci.yml';
}
function workProtected(path) {
  return /^(server\/|prisma\/|app\/middleware\/|\.github\/workflows\/|security\/trusted-governance\/|docs\/security\/)/.test(path) ||
    ['scripts/check.mjs', 'scripts/verify-pr-governance.mjs',
      'docs/releases/V1-RELEASE-STATE.md', 'tests/trusted-governance.test.mjs'].includes(path);
}
/**
 * Every input must come from live GitHub API metadata, never from PR code.
 * Report all errors rather than failing early, including for grandfathered PR #1.
 */
export function validatePolicy({ number, head, headRepo = REPOSITORY,
  base, body = '', files = [], issue = null, openPulls = [] }) {
  const errors = [];
  if (base !== DEVELOPMENT) errors.push('PR target must be development integration.');
  if (headRepo !== REPOSITORY) errors.push('Head must be an internal feature branch in this repository.');
  const legacy = number === 1 && head === LEGACY_BRANCH;
  const role = legacy ? 'work' : roleForBranch(head);
  if (!role) errors.push('Invalid task-specific branch/role.');
  const task = taskIssueNumber(body);
  if (!legacy) {
    if (!task) errors.push('Missing Task issue: #NUMBER in PR body.');
    if (!issue || issue.number !== task || issue.state !== 'open' || issue.pull_request) {
      errors.push('Missing, invalid, closed or non-issue task ownership.');
    }
    const claim = issue?.body ?? '';
    if (role && !claim.split('\n').some(line => line.trim().toLowerCase() === ('Workstream: ' + ROLE[role]).toLowerCase())) {
      errors.push('Task ownership workstream does not match feature branch.');
    }
    if (!claim.split('\n').some(line => line.trim() === 'Branch: ' + TICK + head + TICK)) {
      errors.push('Task ownership branch claim does not match feature branch.');
    }
  }
  const reserved = reservedPaths(issue?.body ?? '');
  for (const path of files) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\')) {
      errors.push('Invalid changed path.'); continue;
    }
    if (legacy && !LEGACY_FILES.has(path)) errors.push('Legacy PR #1 added unreviewed path: ' + path);
    if (role && role !== 'chat01' && isGovernance(path)) errors.push('Unauthorized governance modification: ' + path);
    const legacyAllowed = legacy && (path === 'docs/releases/V1-RELEASE-STATE.md' || path === 'server/routes/sitemap.xml.get.ts');
    if (role === 'work' && workProtected(path) && !legacyAllowed) errors.push('Workstream protected file violation: ' + path);
    if (role === 'chat01' && !chat01Allowed(path)) errors.push('Chat 01 may only change owned governance: ' + path);
    if (role === 'chat03' && (/^app\/pages\//.test(path) || /^app\/components\/classroom\//.test(path)) && !reserved.has(path)) errors.push('Chat 03 needs coordinated UI reservation: ' + path);
    if (!legacy && isShared(path) && !reserved.has(path)) errors.push('Missing exact shared-file reservation: ' + path);
  }
  const touched = new Set(files);
  for (const other of openPulls) {
    if (other.number === number || other.base !== DEVELOPMENT) continue;
    const overlap = [...new Set(other.files ?? [])].filter(path => touched.has(path));
    if (overlap.length) errors.push(`Overlapping open PR #${other.number}: ${overlap.join(', ')}`);
  }
  return errors;
}
