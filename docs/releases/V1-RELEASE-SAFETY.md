# V1 release authorization and recovery proposal

Status as of 19 November 2026. This preparation addresses SKY-AUD-004 and
SKY-AUD-005. Chat 01 and the owner review the authorization design. Chat 03
reviews release and recovery evidence. The current production workflow is
still the existing push-triggered deployment.

## Proposed sole-owner authorization

Keep CI on pull requests and pushes. Move the production deploy job to an
explicit manual dispatch once the owner separately approves that change.
Have the owner submit the complete reviewed candidate commit SHA. Require the
protected production ref and match the input to both the dispatch commit and
the current remote production tip. Cancel before obtaining deployment
credentials if the ref, commit, authorizing identity or rerun identity is
unexpected. Record the review, exact SHA, successful checks and owner decision
in the release record.

A manual dispatch is a meaningful human authorization only when routine
coding credentials cannot invoke it as the owner or alter the gate. Verify
the separate owner and coding identities, ruleset bypass scope and who can
change the workflow. The observed branch rules currently require zero
approving reviews. Record independent review evidence on the exact release
candidate and agree on a review control that fits the available identities.
A required environment reviewer must have a viable reviewer and initiator
arrangement under the repository plan. The owner can choose the manual gate
without relying on a reviewer arrangement the sole owner cannot satisfy.

Before adoption, rehearse allowed owner dispatch, disallowed actor or ref,
SHA mismatch, stale SHA, and rerun cases on a non-deploying workflow. Never
expose deployment credentials in these checks. GitHub requires a dispatchable
workflow to exist on the default branch. Actual default-branch adoption and
any settings or identity changes require a separate owner decision.

## Release recovery preparation

1. Record the healthy prior commit, immutable local image ID or registry
   digest, runtime configuration revision and both origin probe results.
   Retain the artifact until the new release and its recovery window are accepted.
2. Verify backup and restore in an approved isolated database. Confirm that
   each migration leaves the prior image compatible if application rollback
   is part of the plan. With an incompatible migration, plan an approved
   database recovery separately before starting rollout.
3. Start and probe a candidate in an isolated staging context before
   switching traffic. Check both liveness and database readiness, then
   repeat through the real approved proxy path after activation.
4. On failure, keep or restore the prior approved image and configuration
   and verify both probes. If schema compatibility was lost, stop and
   invoke the separately approved database recovery plan. Restoring an
   image does not revert a migration.
5. Record the candidate and restored image IDs, UTC timing, probe results
   and remaining data risk. The owner approves retrial or stops the release.

## Disposable rehearsal

With locally built Skyinnk Node runtime and a locally available PostgreSQL 18
Bookworm image, run:

```sh
bash scripts/rehearse-v1-recovery.sh PRIOR_LOCAL_IMAGE [CANDIDATE_LOCAL_IMAGE]
```

The rehearsal uses a local Unix socket, an internal Docker network, no host
ports, and a disposable database with fictional settings. It creates the
existing User schema with the repository SQL, confirms the initial image
works, observes a live but database-unready candidate, then starts the exact
retained prior image against the same database and repeats both probes. Omit
the second image to rehearse a deliberately invalid candidate configuration
on the same artifact.

This proves the local application recovery path. Migration metadata, an
actual production backup/restore, ingress switch, deployment permissions,
live credentials and monitoring remain separate release evidence.
