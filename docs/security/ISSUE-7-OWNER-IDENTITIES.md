# Issue #7 — Owner-only GitHub identity and bypass separation

## Actual starting state

Repository is **user-owned**, `codewptech/skyinnk`; current GitHub connection identifies as `codewptech`. Both active branch rulesets grant this user ID `118954375` an `Always allow` bypass. A scoped GitHub token from the **same bypass user** cannot prove the human owner is different from an agent, and may retain the owner's bypass authority depending on GitHub's actor evaluation. Merely changing the token's label or using different feature branch names does not solve identity separation.

## Required secure arrangement

| Identity | Purpose | Capabilities | Ruleset bypass |
| --- | --- | --- | --- |
| `codewptech` — owner | Account and ruleset administration, emergency recovery, exclusive production approval | Owner-admin, MFA/passkey, emergency access under owner's control only | Owner-only `Always allow` if still required |
| Dedicated Chat 03 coding identity | Backend/API/security features and PRs | Repository write, issues/PRs; no admin, secrets, deployment, ruleset edit | **None** |
| Dedicated Work coding identity | Public frontend/content features and PRs | Repository write, issues/PRs; no admin, secrets, deployment, ruleset edit | **None** |
| Dedicated Skyinnk Trusted Governance App | Independently verifies PRs and posts check run | Metadata/read, Issues/read, PR/read, Checks/write only | **None** |

Preferred coders: **two independently installed GitHub Apps**, one for Chat 03 and one for Work, with `Contents: read/write`, `Issues: read/write`, `Pull requests: read/write`, `Metadata: read`; no Actions/Checks/Administration/Secrets/Deployments rights. Their installation tokens should be minted and stored by each isolated coding workspace, not sent in chat. Apps must not be on the branch ruleset bypass lists. If the chosen ChatGPT/Codex connector cannot authenticate as distinct App installations, use two separate human-controlled, MFA-protected **machine-user accounts** as repository collaborators with Write role, under GitHub's applicable terms/plan; never use the owner account for AI coding. They may need separate GitHub seats depending on the plan.

## Exact owner-only steps

1. Sign in to GitHub as owner directly, on your own device. Open `https://github.com/codewptech/skyinnk/settings/rules` and review ruleset **27049500** (development) and **27046619** (main). Confirm the only bypass is the owner; do not add either coding App/account or the trusted-check App.
2. Establish separate Chat 03 and Work coding identities. For a GitHub App, use `https://github.com/settings/apps/new` while signed in as owner; configure each private App's minimal repository permissions and install only on `codewptech/skyinnk`. For machine users, invite each distinct account from repository Settings → Collaborators with **Write** (not Admin/Maintain) permissions and require MFA. The owner must approve each installation/invitation.
3. In ChatGPT/Codex/workspace connection settings, **disconnect the owner `codewptech` GitHub connection** used for routine AI work, then connect the appropriate separate identities/integrations where the product supports them. Do not assume a standard connector can act as an App installation merely because an App exists; verify real author/bot identity on a test feature-branch commit and test PR.
4. Confirm each coding identity has **no role/ruleset bypass** and **cannot push directly to `development/v1-public-launch` or `main`**. Confirm it can create only a task branch and submit a PR. Try a deliberately invalid PR on a test branch and observe GitHub blocking merge without any bypass. Record the actor shown by GitHub.
5. Keep the owner's hardware-backed passkey/MFA, recovery codes and emergency GitHub sessions private. Keep separate App private keys and short-lived installation tokens in isolated secret stores. Do **not** paste passwords, OAuth codes, PATs, PEM files, or tokens into ChatGPT.
6. Enable/require the trusted governance App check in the development ruleset **only after** the App has emitted a real successful check, and pin **Source** to that App. Leave existing `Development CI` required. Keep production `CI` and `main` protections unchanged.
7. Audit collaborators, GitHub Apps, installation permissions and ruleset bypasses after activation. Revoke old routine AI access under `codewptech`, rather than merely telling the agent not to use it.

**Important:** I cannot use the connected GitHub app to administer owner settings, create installed App credentials, move a user's login connection, or safely recover the owner's 2FA. These are **not completed** and require the owner. GitHub's default-branch production deployment is not touched.
