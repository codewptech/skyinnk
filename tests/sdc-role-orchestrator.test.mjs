import test from "node:test";
import assert from "node:assert/strict";
import { plan, snapshot } from "../scripts/sdc-role-orchestrator.mjs";
const SHA = "a".repeat(40),
  HEAD = "b".repeat(40);
function task(n, role = "Chat 03", state = "PR_OPEN") {
  let source = "chat03";
  if (role === "Work") source = "work";
  else if (role === "Chat 01") source = "chat01";
  const body =
    "Workstream: " +
    role +
    "\nBranch: `" +
    source +
    "/task-test-" +
    n +
    "`\nTarget: `development/v1-public-launch`\n### Execution state\n" +
    state +
    "\n### Executor\n" +
    (state === "READY" ? "unclaimed" : "Test executor") +
    "\n### Dependencies\n- START: none\n- INTEGRATION: none\n### Owned / affected paths\n- `scripts/owned-" +
    n +
    ".mjs`\n### Reserved shared paths\nNone.\n";
  return { number: n, state: "open", body };
}
function pr(
  n,
  taskNum,
  head = HEAD,
  draft = false,
  baseRef = "development/v1-public-launch",
) {
  return {
    number: n,
    state: "open",
    draft,
    body: "Task issue: #" + taskNum + "\n",
    head: { sha: head },
    base: { ref: baseRef },
  };
}
function run(opts = {}) {
  return plan({ issues: [task(2)], prs: [], developmentSha: SHA, ...opts });
}
test("controller has six SDC roles plus separate steward, never a coding worker", () => {
  const x = run();
  assert.deepEqual(Object.keys(x.roles), [
    "SDC 01",
    "SDC 02",
    "SDC 03",
    "SDC 04",
    "SDC 05",
    "SDC 06",
    "Steward",
  ]);
  assert.equal(x.summary.actualAgentRunsStarted, 0);
  assert.equal(x.summary.automaticMerges, 0);
  assert.equal(x.status, "ROUTING_ONLY_NO_AGENT_DISPATCH");
});
test("missing independent exact-head review is assigned to existing SDC 03", () => {
  const x = run({ issues: [task(12)], prs: [pr(14, 12)] });
  const a = x.assignments.find((p) => p.pr === 14);
  assert.equal(a.role, "SDC 03");
  assert.equal(a.kind, "INDEPENDENT_REVIEW");
  assert.equal(a.head, HEAD);
  assert.equal(a.dispatchStatus, "BLOCKED_NO_VERIFIED_CHAT_TRIGGER");
});
test("old review on different head is not sufficient", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [{ headSha: "c".repeat(40), verdict: "ACCEPTED", independent: true }],
    },
  });
  assert.equal(
    x.assignments.find((p) => p.pr === 14).kind,
    "INDEPENDENT_REVIEW",
  );
});
test("review correction routes to SDC 05 with the existing file owner preserved", () => {
  const x = run({
    issues: [task(35, "Work")],
    prs: [pr(56, 35)],
    reviewsByPr: {
      56: [{ headSha: HEAD, verdict: "CHANGES_REQUESTED", independent: true }],
    },
  });
  const a = x.assignments.find((p) => p.pr === 56);
  assert.equal(a.role, "SDC 05");
  assert.equal(a.sourceOwner, "SDC 02");
  assert.equal(a.kind, "REVIEW_CORRECTION");
  assert.equal(a.priority, 0);
});
test("no automatic merge or integration based on unverified CI", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [{ headSha: HEAD, verdict: "ACCEPTED", independent: true }],
    },
  });
  assert.equal(
    x.assignments.some((a) => a.role === "SDC 06"),
    false,
  );
  assert.match(x.blockers.join(" "), /CI not verified/);
});
test("when review and CI are independently proven, only a gate assignment is created", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [{ headSha: HEAD, verdict: "ACCEPTED", independent: true }],
    },
    checksByPr: {
      14: [{ headSha: HEAD, name: "Development CI", conclusion: "success" }],
    },
  });
  const a = x.assignments.find((p) => p.pr === 14);
  assert.equal(a.role, "SDC 06");
  assert.equal(a.kind, "INTEGRATION_GATE");
  assert.equal(a.dispatchStatus, "BLOCKED_NO_VERIFIED_CHAT_TRIGGER");
});
test("ready issues are routed to their actual role, no implementation starts", () => {
  const x = run({
    issues: [
      task(35, "Work", "READY"),
      task(36, "Chat 03", "READY"),
      task(54, "Chat 01", "READY"),
    ],
  });
  const tasks = x.assignments.filter((p) => p.kind === "ELIGIBLE_TASK");
  assert.deepEqual(tasks.map((x) => x.role).sort(), [
    "SDC 01",
    "SDC 02",
    "SDC 04",
  ]);
  assert.equal(x.summary.actualAgentRunsStarted, 0);
});
test("draft and closed PRs not assigned to reviewers", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12, HEAD, true), { ...pr(15, 12), state: "closed" }],
  });
  assert.equal(x.assignments.filter((x) => x.pr).length, 0);
});
test("unlinked PR blocked rather than invented assignment", () => {
  const x = run({
    issues: [],
    prs: [
      {
        number: 40,
        state: "open",
        body: "",
        head: { sha: HEAD },
        base: { ref: "development/v1-public-launch" },
      },
    ],
  });
  assert.match(x.blockers.join(" "), /missing linked/);
});
test("identical signal snapshots preserve idempotency keys", () => {
  const args = { issues: [task(12)], prs: [pr(14, 12)] };
  assert.deepEqual(
    run(args).assignments.map((x) => x.idempotencyKey),
    run(args).assignments.map((x) => x.idempotencyKey),
  );
});
test("rejects invalid development SHA", () => {
  assert.throws(
    () => plan({ developmentSha: "unknown" }),
    /Verified development SHA/,
  );
});

test("development push signals SDC 03 milestone re-audit without pretending it ran", () => {
  const x = run({ event: { kind: "push" } });
  const audit = x.assignments.find((p) => p.kind === "MILESTONE_REAUDIT");
  assert.equal(audit.role, "SDC 03");
  assert.equal(audit.head, SHA);
  assert.equal(audit.dispatchStatus, "BLOCKED_NO_VERIFIED_CHAT_TRIGGER");
  assert.equal(x.summary.actualAgentRunsStarted, 0);
});

test("READY target and branch ownership must agree with PEA-2 lane", () => {
  const wrongBranch = task(66, "Work", "READY");
  wrongBranch.body = wrongBranch.body.replace(
    "work/task-test-66",
    "chat03/task-cross-owner",
  );
  const a = run({ issues: [wrongBranch] });
  assert.equal(
    a.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
    false,
  );
  assert.match(
    a.blockers.join(" "),
    /PEA-2 target\/branch ownership not verified/,
  );
  const wrongTarget = task(67, "Chat 03", "READY");
  wrongTarget.body = wrongTarget.body.replace(
    "Target: `development/v1-public-launch`",
    "Target: `main`",
  );
  const b = run({ issues: [wrongTarget] });
  assert.equal(
    b.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
    false,
  );
  assert.match(
    b.blockers.join(" "),
    /PEA-2 target\/branch ownership not verified/,
  );
});
test("canonical quoted PEA-2 branch and target admit all three source lanes", () => {
  const x = run({
    issues: [
      task(65, "Work", "READY"),
      task(66, "Chat 03", "READY"),
      task(67, "Chat 01", "READY"),
    ],
  });
  assert.deepEqual(
    x.assignments
      .filter((p) => p.kind === "ELIGIBLE_TASK")
      .map((p) => p.issue)
      .sort((a, b) => a - b),
    [65, 66, 67],
  );
});
test("one NEXT eligible READY packet per actual workstream, others retained in queue", () => {
  const x = run({
    issues: [
      task(35, "Work", "READY"),
      task(36, "Work", "READY"),
      task(37, "Chat 03", "READY"),
    ],
  });
  const ready = x.assignments.filter((p) => p.kind === "ELIGIBLE_TASK");
  assert.deepEqual(
    ready.map((p) => p.issue).sort((a, b) => a - b),
    [35, 37],
  );
  assert.deepEqual(x.queuedReady, [
    {
      role: "SDC 02",
      issue: 36,
      reason: "AWAIT_PREVIOUS_ELIGIBLE_TASK_HANDOFF",
    },
  ]);
  assert.equal(x.summary.actualAgentRunsStarted, 0);
});
test("unverifiable first READY task cannot starve later eligible task of same role", () => {
  const first = task(65, "Work", "READY");
  first.body = first.body.replace("- START: none", "- START: #9999");
  const x = run({ issues: [first, task(66, "Work", "READY")] });
  assert.equal(
    x.assignments.find((p) => p.kind === "ELIGIBLE_TASK")?.issue,
    66,
  );
  assert.equal(x.queuedReady.length, 0);
  assert.match(
    x.blockers.join(" "),
    /Issue #65: dependency integration not verified/,
  );
});
test("no new READY packet is emitted while same source role has CURRENT work", () => {
  const x = run({
    issues: [
      task(35, "Chat 03", "REVIEWING"),
      task(36, "Chat 03", "READY"),
      task(37, "Chat 03", "READY"),
    ],
  });
  assert.equal(
    x.assignments.filter((p) => p.kind === "ELIGIBLE_TASK").length,
    0,
  );
  assert.equal(x.queuedReady.length, 0);
  assert.match(x.blockers.join(" "), /CURRENT work not finished/);
});

test("existing CURRENT work blocks another READY task in the same executor lane", () => {
  const x = run({
    issues: [task(35, "Work", "REVIEWING"), task(36, "Work", "READY")],
  });
  assert.equal(
    x.assignments.some((p) => p.kind === "ELIGIBLE_TASK" && p.issue === 36),
    false,
  );
  assert.match(x.blockers.join(" "), /CURRENT work not finished/);
});
test("unresolved START dependency blocks PEA-2 READY task without guessing", () => {
  const issue = task(65, "Work", "READY");
  issue.body = issue.body.replace("- START: none", "- START: #64");
  const x = run({ issues: [issue] });
  assert.equal(
    x.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
    false,
  );
  assert.match(x.blockers.join(" "), /dependency integration not verified/);
});
test("missing typed dependencies or path claims block READY task", () => {
  const issue = task(65, "Work", "READY");
  issue.body = issue.body.replace("- START: none", "");
  const missingDeps = run({ issues: [issue] });
  assert.match(missingDeps.blockers.join(" "), /unverified typed dependencies/);
  const missingPaths = task(66, "Work", "READY");
  missingPaths.body = missingPaths.body.replace("- `scripts/owned-66.mjs`", "");
  const result = run({ issues: [missingPaths] });
  assert.match(result.blockers.join(" "), /no exact claimed paths/);
});
test("READY claimed path cannot overlap an existing open PR", () => {
  const issue = task(65, "Work", "READY");
  const x = run({
    issues: [issue, task(35, "Chat 03", "REVIEWING")],
    prs: [pr(56, 35)],
    filesByPr: { 56: ["scripts/owned-65.mjs"] },
  });
  assert.equal(
    x.assignments.some((p) => p.kind === "ELIGIBLE_TASK" && p.issue === 65),
    false,
  );
  assert.match(x.blockers.join(" "), /overlap an open PR/);
});
test("missing GitHub evidence explicitly blocks review or integration routing", () => {
  const x = run({
    issues: [task(35, "Work")],
    prs: [pr(56, 35)],
    evidenceErrorsByPr: { 56: ["check-runs unavailable"] },
  });
  assert.equal(
    x.assignments.some((p) => p.pr === 56),
    false,
  );
  assert.match(x.blockers.join(" "), /GitHub evidence unavailable/);
});
test("untrusted reviewer correction cannot route mandatory engineer repair", () => {
  const x = run({
    issues: [task(35, "Work")],
    prs: [pr(56, 35)],
    reviewsByPr: {
      56: [{ headSha: HEAD, verdict: "CHANGES_REQUESTED", independent: false }],
    },
  });
  assert.equal(
    x.assignments.find((p) => p.pr === 56).kind,
    "INDEPENDENT_REVIEW",
  );
});
test("idempotency is explicitly limited to one snapshot without persistent dispatch", () => {
  const x = run();
  assert.equal(x.deduplication, "IN_MEMORY_THIS_SNAPSHOT_ONLY_NOT_PERSISTENT");
  assert.equal(x.summary.actualAgentRunsStarted, 0);
});

test("newer failed exact-head CI overrides an older successful check-run", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [{ headSha: HEAD, verdict: "ACCEPTED", independent: true }],
    },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
        { id: 2, headSha: HEAD, name: "Development CI", conclusion: "failure" },
      ],
    },
  });
  assert.equal(
    x.assignments.some((p) => p.kind === "INTEGRATION_GATE"),
    false,
  );
  assert.match(x.blockers.join(" "), /CI not verified/);
});
test("latest successful exact-head CI supersedes previous failure", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [{ headSha: HEAD, verdict: "ACCEPTED", independent: true }],
    },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "failure" },
        { id: 2, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
    },
  });
  assert.equal(
    x.assignments.find((p) => p.pr === 14)?.kind,
    "INTEGRATION_GATE",
  );
});

test("production and unknown-target PRs never enter development reviewer or integrator queue", () => {
  const accepted = {
    headSha: HEAD,
    verdict: "ACCEPTED",
    independent: true,
    reviewerLogin: "trusted",
    reviewId: 1,
  };
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12, HEAD, false, "main"), pr(15, 12, HEAD, false, "unknown")],
    reviewsByPr: { 14: [accepted], 15: [accepted] },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
      15: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
    },
  });
  assert.equal(
    x.assignments.some((a) => a.pr === 14 || a.pr === 15),
    false,
  );
  assert.match(
    x.blockers.join(" "),
    /PR #14: not a verified development-targeted PR/,
  );
  assert.match(
    x.blockers.join(" "),
    /PR #15: not a verified development-targeted PR/,
  );
});

test("newer independent approval supersedes old corrections from SAME authenticated reviewer", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [
        {
          headSha: HEAD,
          verdict: "CHANGES_REQUESTED",
          independent: true,
          reviewerLogin: "trusted",
          reviewId: 1,
        },
        {
          headSha: HEAD,
          verdict: "ACCEPTED",
          independent: true,
          reviewerLogin: "trusted",
          reviewId: 2,
        },
      ],
    },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
    },
  });
  assert.equal(
    x.assignments.find((a) => a.pr === 14)?.kind,
    "INTEGRATION_GATE",
  );
});

test("newer independent correction supersedes earlier approval from SAME reviewer", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [
        {
          headSha: HEAD,
          verdict: "ACCEPTED",
          independent: true,
          reviewerLogin: "trusted",
          reviewId: 1,
        },
        {
          headSha: HEAD,
          verdict: "CHANGES_REQUESTED",
          independent: true,
          reviewerLogin: "trusted",
          reviewId: 2,
        },
      ],
    },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
    },
  });
  assert.equal(
    x.assignments.find((a) => a.pr === 14)?.kind,
    "REVIEW_CORRECTION",
  );
});

test("a correction from another independently trusted reviewer still blocks integration", () => {
  const x = run({
    issues: [task(12)],
    prs: [pr(14, 12)],
    reviewsByPr: {
      14: [
        {
          headSha: HEAD,
          verdict: "CHANGES_REQUESTED",
          independent: true,
          reviewerLogin: "reviewer-a",
          reviewId: 1,
        },
        {
          headSha: HEAD,
          verdict: "ACCEPTED",
          independent: true,
          reviewerLogin: "reviewer-b",
          reviewId: 2,
        },
      ],
    },
    checksByPr: {
      14: [
        { id: 1, headSha: HEAD, name: "Development CI", conclusion: "success" },
      ],
    },
  });
  assert.equal(
    x.assignments.find((a) => a.pr === 14)?.kind,
    "REVIEW_CORRECTION",
  );
});

test("cross-workstream BUILDING claim blocks an overlapping READY issue before any PR", () => {
  const active = task(64, "Work", "BUILDING");
  active.body = active.body.replace(
    "scripts/owned-64.mjs",
    "scripts/owned-65.mjs",
  );
  const x = run({
    issues: [
      active,
      task(65, "Chat 03", "READY"),
      task(66, "Chat 03", "READY"),
    ],
  });
  assert.match(
    x.blockers.join(" "),
    /Issue #65: conflicts with active claim on issue #64/,
  );
  assert.deepEqual(
    x.assignments.filter((p) => p.kind === "ELIGIBLE_TASK").map((p) => p.issue),
    [66],
  );
});

test("PAUSED and executor-held BLOCKED claims protect exact shared reservations", () => {
  for (const state of ["PAUSED", "BLOCKED"]) {
    const active = task(64, "Chat 01", state);
    active.body = active.body.replace("None.", "- `nuxt.config.ts`");
    const ready = task(65, "Chat 03", "READY");
    ready.body = ready.body.replace("None.", "- `nuxt.config.ts`");
    const x = run({ issues: [active, ready] });
    assert.equal(
      x.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
      false,
    );
    assert.match(
      x.blockers.join(" "),
      /conflicts with active claim on issue #64/,
    );
    active.body = active.body.replace("Test executor", "unclaimed");
    if (state === "BLOCKED") {
      assert.equal(
        run({ issues: [active, ready] }).assignments.find(
          (p) => p.kind === "ELIGIBLE_TASK",
        )?.issue,
        65,
      );
    }
  }
});

test("an active issue claiming the same branch blocks a disjoint READY task", () => {
  const active = task(64, "Chat 03", "PAUSED");
  active.body = active.body.replace(
    "chat03/task-test-64",
    "chat03/task-test-65",
  );
  const x = run({ issues: [active, task(65, "Chat 03", "READY")] });
  assert.equal(
    x.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
    false,
  );
  assert.match(
    x.blockers.join(" "),
    /conflicts with active claim on issue #64/,
  );
});

test("missing or malformed active path evidence blocks READY routing explicitly", () => {
  const active = task(64, "Work", "BUILDING");
  active.body = active.body.replace("None.", "- `scripts/*`");
  const x = run({ issues: [active, task(65, "Chat 03", "READY")] });
  assert.equal(
    x.assignments.some((p) => p.kind === "ELIGIBLE_TASK"),
    false,
  );
  assert.match(
    x.blockers.join(" "),
    /active claim evidence unavailable for issue #64/,
  );
});

test("native comments and dismissals preserve only surviving exact-head review decisions", async (t) => {
  const rawPr = { ...pr(14, 12), user: { login: "author" } };
  const results = {
    "/issues": [task(12)],
    "/pulls": [rawPr],
    "/branches/development/v1-public-launch": { commit: { sha: SHA } },
    "/pulls/14/files": [],
    [`/commits/${HEAD}/check-runs`]: {
      check_runs: [
        {
          id: 1,
          head_sha: HEAD,
          name: "Development CI",
          app: { slug: "github-actions" },
          conclusion: "success",
        },
      ],
    },
  };
  const correction = {
    id: 1,
    commit_id: HEAD,
    state: "CHANGES_REQUESTED",
    user: { login: "reviewer-a" },
  };
  const approval = {
    id: 2,
    commit_id: HEAD,
    state: "APPROVED",
    user: { login: "reviewer-b" },
  };
  const comment = { ...correction, id: 3, state: "COMMENTED" };
  const dismissed = { ...correction, id: 4, state: "DISMISSED" };
  t.mock.method(globalThis, "fetch", async (url) => {
    const path = new URL(url).pathname.replace("/repos/codewptech/skyinnk", "");
    assert.ok(Object.hasOwn(results, path), path);
    return Response.json(results[path]);
  });
  const previous = process.env.SDC_TRUSTED_REVIEWER_LOGINS;
  process.env.SDC_TRUSTED_REVIEWER_LOGINS = "reviewer-a,reviewer-b";
  t.after(() => {
    if (previous === undefined) delete process.env.SDC_TRUSTED_REVIEWER_LOGINS;
    else process.env.SDC_TRUSTED_REVIEWER_LOGINS = previous;
  });
  for (const [reviews, expected] of [
    [[correction, approval, comment], "REVIEW_CORRECTION"],
    [[correction, approval, dismissed], "REVIEW_CORRECTION"],
    [
      [{ ...correction, state: "DISMISSED" }, approval, comment],
      "INTEGRATION_GATE",
    ],
    [[{ ...approval, state: "DISMISSED" }, comment], "INDEPENDENT_REVIEW"],
    [
      [approval, { ...approval, id: 3, state: "COMMENTED" }],
      "INTEGRATION_GATE",
    ],
  ]) {
    results["/pulls/14/reviews"] = reviews;
    const x = plan(await snapshot({ repo: "codewptech/skyinnk" }));
    assert.equal(x.assignments.find((p) => p.pr === 14)?.kind, expected);
  }
});
