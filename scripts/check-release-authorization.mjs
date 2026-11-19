// Pure rehearsal of the proposed owner gate. No deployment workflow calls this.
const commitPattern = /^[a-f0-9]{40}$/;

export function assertReleaseAuthorization({
  repository, eventName, ref, actor, triggeringActor, expectedOwner,
  requestedSha, eventSha, currentSha,
}) {
  if (repository !== 'codewptech/skyinnk' ||
      eventName !== 'workflow_dispatch' || ref !== 'refs/heads/main') {
    throw new Error('Release requires a manual dispatch on the protected production ref.');
  }
  if (typeof expectedOwner !== 'string' || !expectedOwner ||
      actor !== expectedOwner || triggeringActor !== expectedOwner) {
    throw new Error('Release dispatch and rerun identities must both match the configured owner.');
  }
  if (typeof requestedSha !== 'string' || !commitPattern.test(requestedSha) || requestedSha !== eventSha ||
      requestedSha !== currentSha) {
    throw new Error('The requested release must match the dispatch and current production tip.');
  }
}
