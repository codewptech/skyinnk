import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReleaseAuthorization } from '../scripts/check-release-authorization.mjs';

const sha = 'a'.repeat(40);
const allowed = {
  repository: 'codewptech/skyinnk', eventName: 'workflow_dispatch', ref: 'refs/heads/main',
  actor: 'fixture-owner', triggeringActor: 'fixture-owner', expectedOwner: 'fixture-owner',
  requestedSha: sha, eventSha: sha, currentSha: sha,
};

test('the proposed release gate allows only the exact owner-dispatched current commit', () => {
  assert.doesNotThrow(() => assertReleaseAuthorization(allowed));
  for (const overrides of [
    { eventName: 'push' }, { ref: 'refs/heads/development/v1-public-launch' },
    { repository: 'fixture/skyinnk' }, { actor: 'fixture-contributor' },
    { triggeringActor: 'fixture-contributor' }, { expectedOwner: '' },
    { requestedSha: sha.slice(0, 7) }, { eventSha: 'b'.repeat(40) },
    { currentSha: 'c'.repeat(40) }, { currentSha: undefined },
  ]) {
    assert.throws(() => assertReleaseAuthorization({ ...allowed, ...overrides }));
  }
});
