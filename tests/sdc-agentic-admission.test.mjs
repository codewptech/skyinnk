import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import test from 'node:test'

// Run the exact JavaScript embedded in the gh-aw source, not a copied mock of its rules.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = process.env.SKYINNK_SDC_SOURCE || resolve(root, '.github/workflows/skyinnk-sdc-cycle.md')
const source = readFileSync(sourcePath, 'utf8')
const marker = '        script: |\n'
const start = source.indexOf(marker)
assert.ok(start !== -1, 'preactivation must include an inline script')
const lines = source.slice(start + marker.length).split('\n')
const extracted = []
for (const line of lines) {
  if (!line.startsWith('          ')) break
  extracted.push(line.slice(10))
}
assert.ok(extracted.some(line => line.includes("core.setOutput('eligible'")), 'extracted preactivation was incomplete')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const executeAdmission = new AsyncFunction('github', 'context', 'core', extracted.join('\n'))

function issue(number, {
  role = 'Work', state = 'READY', branch = 'work/task-original-lesson',
  target = '`development/v1-public-launch`', start = 'none', integration = 'none',
  path = 'content/review/original-lesson.md',
} = {}) {
  return {
    number,
    body: [
      `Workstream: ${role}`,
      'Branch: `' + branch + '`',
      'Target: ' + target,
      '',
      '### Execution state',
      state,
      '',
      '### Dependencies',
      '- START: ' + start,
      '- INTEGRATION: ' + integration,
      '',
      '### Owned / affected paths',
      '- `' + path + '`',
      '',
      '### Reserved shared paths',
      'None.',
      '',
    ].join('\n'),
  }
}

async function admission(issues, prs = []) {
  let eligible
  const github = {
    rest: {
      issues: { listForRepo: async () => ({ data: issues }) },
      pulls: { list: async () => ({ data: prs }) },
    },
  }
  const core = {
    info() {},
    setOutput(key, value) { if (key === 'eligible') eligible = value },
  }
  await executeAdmission(github, { repo: { owner: 'codewptech', repo: 'skyinnk' } }, core)
  assert.ok(eligible === 'true' || eligible === 'false', 'must explicitly emit admission decision')
  return eligible === 'true'
}

test('no READY task blocks inference', async () => {
  assert.equal(await admission([issue(101, { state: 'BACKLOG' })]), false)
})
test('canonical backtick-quoted Target admits real READY Work issue', async () => {
  assert.equal(await admission([issue(101)]), true)
})
test('unquoted legacy Target also admits READY Work issue', async () => {
  assert.equal(await admission([issue(101, { target: 'development/v1-public-launch' })]), true)
})
test('REVIEWING unrelated same-lane issue does not stall new work', async () => {
  assert.equal(await admission([
    issue(101, { role: 'Chat 03', branch: 'chat03/task-new-api' }),
    issue(78, { role: 'Chat 03', state: 'REVIEWING', branch: 'chat03/task-gh-aw-sdc-cycle' }),
  ]), true)
})
test('BUILDING same-lane issue blocks concurrent executor', async () => {
  assert.equal(await admission([issue(101), issue(78, { state: 'BUILDING', branch: 'work/task-other' })]), false)
})
test('CHANGES_REQUESTED same-lane issue has priority', async () => {
  assert.equal(await admission([issue(101), issue(78, { state: 'CHANGES_REQUESTED', branch: 'work/task-other' })]), false)
})
test('wrong branch namespace is rejected', async () => {
  assert.equal(await admission([issue(101, { branch: 'chat03/task-wrong-lane' })]), false)
})
test('unresolved START dependency cannot be waived', async () => {
  assert.equal(await admission([issue(101, { start: '#36' })]), false)
})
test('existing task-linked open PR blocks duplicate work', async () => {
  assert.equal(await admission([issue(101)], [{ body: 'Task issue: #101\nWorkstream: Work' }]), false)
})
test('wrong Target is rejected', async () => {
  assert.equal(await admission([issue(101, { target: '`main`' })]), false)
})
test('pagination bound fails closed', async () => {
  const many = Array.from({ length: 100 }, (_, i) => issue(i + 100, { state: 'BACKLOG' }))
  await assert.rejects(admission(many), /Issue listing incomplete/)
})