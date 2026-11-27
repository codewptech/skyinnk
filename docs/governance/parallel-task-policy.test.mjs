import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parsePacket,
  validatePacket,
  changePaths,
  eligibleTask,
  integrationEligible,
  detectCycles,
  validateGraph,
  nextStateLegal,
  rankReady,
} from "./parallel-task-policy.mjs";

function taskBody(extra = {}) {
  const lines = {
    workstream: "Work",
    branch: "work/task-discovery-check",
    lane: "Learning Experience",
    priority: "P1",
    risk: "ordinary",
    state: "READY",
    executor: "unclaimed",
    start: "none",
    integration: "#24",
    soft: "#14",
    external: "none for implementation",
    owned: "- `app/pages/courses/index.vue`",
    shared: "None.",
    ...extra,
  };
  return [
    "Workstream: " + lines.workstream,
    "Branch: `" + lines.branch + "`",
    "Target: `development/v1-public-launch`",
    "Delivery lane: " + lines.lane,
    "Priority: " + lines.priority,
    "Risk: " + lines.risk,
    "### Outcome",
    "Verify an isolated fictional course in a browser without modifying production files.",
    "### Execution state",
    lines.state,
    "### Executor",
    lines.executor,
    "### Dependencies",
    "- START: " + lines.start,
    "- INTEGRATION: " + lines.integration,
    "- SOFT: " + lines.soft,
    "- External approval: " + lines.external,
    "### Acceptance",
    "- [ ] Guest route and negative path observed.",
    "- [ ] Current exact-head CI passes.",
    "### Owned / affected paths",
    lines.owned,
    "### Reserved shared paths",
    lines.shared,
  ].join("\n");
}
test("valid task packet is parsed and validated", () => {
  const body = taskBody(),
    packet = parsePacket(body);
  assert.deepEqual(validatePacket(packet, { number: 99 }), []);
  assert.equal(packet.branch, "work/task-discovery-check");
  assert.deepEqual(packet.integration, [24]);
  assert.deepEqual(packet.soft, [14]);
  assert.equal(body, taskBody());
});
test("invalid placeholders cannot become ready", () => {
  assert.ok(
    validatePacket(parsePacket(taskBody({ workstream: "REPLACE_WITH_Work" })))
      .length,
  );
  assert.ok(
    validatePacket(
      parsePacket(taskBody({ branch: "REPLACE_WITH_role/task-x" })),
    ).length,
  );
});
test("role ownership must match delivery lane", () => {
  assert.match(
    validatePacket(parsePacket(taskBody({ workstream: "Chat 03" }))).join("|"),
    /Branch|Learning Experience/,
  );
  assert.match(
    validatePacket(parsePacket(taskBody({ lane: "Governance" }))).join("|"),
    /Governance requires Chat 01/,
  );
});
test("READY and BUILDING require honest executor status", () => {
  assert.match(
    validatePacket(parsePacket(taskBody({ executor: "run:abc" }))).join("|"),
    /READY task must/,
  );
  assert.match(
    validatePacket(parsePacket(taskBody({ state: "BUILDING" }))).join("|"),
    /needs real executor/,
  );
});
test("malformed dependency tokens fail closed", () => {
  assert.match(
    validatePacket(parsePacket(taskBody({ start: "unknown-task" }))).join("|"),
    /Malformed START/,
  );
  assert.match(
    validatePacket(
      parsePacket(taskBody({ integration: "#24 plus maybe #26" })),
    ).join("|"),
    /Malformed INTEGRATION/,
  );
});
test("repeated and self-dependencies fail validation", () => {
  assert.match(
    validatePacket(parsePacket(taskBody({ start: "#24" }))).join("|"),
    /Repeated dependency/,
  );
  assert.match(
    validatePacket(parsePacket(taskBody({ start: "#99" })), {
      number: 99,
    }).join("|"),
    /Self dependency/,
  );
});
test("START blocks execution but INTEGRATION does not", () => {
  const packet = parsePacket(taskBody({ start: "#8" }));
  assert.equal(
    eligibleTask(packet, { issueStates: { 8: "BUILDING" } }).eligible,
    false,
  );
  assert.equal(
    eligibleTask(packet, { issueStates: { 8: "DONE" } }).eligible,
    true,
  );
  assert.equal(eligibleTask(parsePacket(taskBody())).eligible, true);
});
test("unpublished task claims prevent overlapping source edits", () => {
  assert.match(
    eligibleTask(parsePacket(taskBody()), {
      claims: [
        {
          id: 10,
          branch: "chat03/task-conflict",
          paths: ["app/pages/courses/index.vue"],
        },
      ],
    }).reasons.join("|"),
    /Active task claim conflict/,
  );
});
test("rename checks both paths, rejecting incomplete metadata", () => {
  const old = "app/pages/courses/index.vue";
  assert.deepEqual(
    changePaths([
      {
        status: "renamed",
        previous_filename: old,
        filename: "app/renamed.vue",
      },
    ]),
    [old, "app/renamed.vue"],
  );
  assert.match(
    eligibleTask(parsePacket(taskBody()), {
      openPRs: [
        {
          number: 88,
          branch: "chat03/task-conflict",
          files: [
            {
              status: "renamed",
              previous_filename: old,
              filename: "app/renamed.vue",
            },
          ],
        },
      ],
    }).reasons.join("|"),
    /Open PR conflict/,
  );
  assert.throws(
    () => changePaths([{ status: "renamed", filename: "app/new.vue" }]),
    /Incomplete changed path/,
  );
});
test("graph detects cycles across both blocking dependency classes", () => {
  assert.equal(
    detectCycles([
      { number: 4, packet: { start: [5], integration: [] } },
      { number: 5, packet: { start: [], integration: [4] } },
    ]).length,
    1,
  );
  assert.equal(
    detectCycles([
      { number: 4, packet: { start: [5], integration: [] } },
      { number: 5, packet: { start: [], integration: [] } },
    ]).length,
    0,
  );
});
test("integration evidence must match exact PR head and current base", () => {
  const packet = { ...parsePacket(taskBody()), state: "READY_TO_INTEGRATE" };
  const head = "a".repeat(40),
    base = "b".repeat(40);
  const valid = {
    issueStates: { 24: "DONE" },
    pr: { state: "open", headSha: head, baseSha: base, executor: "agent-A" },
    checks: [{ headSha: head, name: "Development CI", conclusion: "success" }],
    reviews: [
      {
        headSha: head,
        kind: "technical",
        verdict: "accepted",
        reviewer: "agent-B",
      },
    ],
    currentBaseSha: base,
    collisions: [],
  };
  assert.equal(integrationEligible(packet, valid).eligible, true);
  assert.match(
    integrationEligible(packet, {
      ...valid,
      issueStates: { 24: "BUILDING" },
    }).reasons.join("|"),
    /INTEGRATION dependency/,
  );
  assert.match(
    integrationEligible(packet, {
      ...valid,
      checks: [{ ...valid.checks[0], headSha: "c".repeat(40) }],
    }).reasons.join("|"),
    /exact PR head/,
  );
  assert.match(
    integrationEligible(packet, {
      ...valid,
      reviews: [{ ...valid.reviews[0], headSha: "d".repeat(40) }],
    }).reasons.join("|"),
    /review evidence/,
  );
  assert.match(
    integrationEligible(packet, {
      ...valid,
      reviews: [{ ...valid.reviews[0], reviewer: "agent-A" }],
    }).reasons.join("|"),
    /review evidence/,
  );
  assert.match(
    integrationEligible(packet, {
      ...valid,
      currentBaseSha: "f".repeat(40),
    }).reasons.join("|"),
    /base not reconciled/,
  );
});
test("graph rejects missing or cyclic references while allowing known PR IDs", () => {
  assert.match(
    validateGraph([
      { number: 10, packet: { start: [11], integration: [], soft: [] } },
    ]).join("|"),
    /missing START/,
  );
  assert.match(
    validateGraph([
      { number: 10, packet: { start: [11], integration: [], soft: [] } },
      { number: 11, packet: { start: [], integration: [10], soft: [] } },
    ]).join("|"),
    /Dependency cycle/,
  );
  assert.deepEqual(
    validateGraph(
      [{ number: 10, packet: { start: [], integration: [24], soft: [] } }],
      { knownPullRequests: [24] },
    ),
    [],
  );
});
test("state transitions cannot skip review or integration", () => {
  assert.equal(nextStateLegal("BACKLOG", "DONE"), false);
  assert.equal(nextStateLegal("PR_OPEN", "READY_TO_INTEGRATE"), false);
  assert.equal(nextStateLegal("REVIEWING", "CHANGES_REQUESTED"), true);
  assert.equal(nextStateLegal("VERIFIED", "DONE"), true);
});
test("ranking deterministically orders priority and age", () => {
  assert.ok(
    rankReady({ priority: "P0", number: 9 }, { priority: "P1", number: 1 }) < 0,
  );
  assert.ok(
    rankReady({ priority: "P1", unlocks: 3 }, { priority: "P1", unlocks: 1 }) <
      0,
  );
  assert.ok(
    rankReady(
      { priority: "P1", unlocks: 0, created: 1 },
      { priority: "P1", unlocks: 0, created: 2 },
    ) < 0,
  );
});

test("different tasks cannot claim the same branch even with disjoint paths", () => {
  const packet = parsePacket(taskBody());
  for (const paths of [
    ["app/pages/elsewhere.vue"],
    ["app/pages/courses/index.vue"],
    [],
  ]) {
    const claim = { id: 88, branch: packet.branch, paths };
    const result = eligibleTask(packet, { taskNumber: 89, claims: [claim] });
    assert.equal(result.eligible, false);
    assert.match(
      result.reasons.join("|"),
      /Active task claim conflict: 88.*same branch/,
    );
    assert.equal(
      eligibleTask(packet, { taskNumber: 88, claims: [claim] }).eligible,
      true,
    );
  }
});

test("different branches with disjoint claims can start, including similarly named branches", () => {
  const packet = parsePacket(taskBody());
  const claim = {
    id: 88,
    branch: packet.branch + "-other",
    paths: ["app/pages/elsewhere.vue"],
  };
  assert.equal(
    eligibleTask(packet, { taskNumber: 89, claims: [claim] }).eligible,
    true,
  );
});

test("an unidentified contender does not match the current task identity", () => {
  const packet = parsePacket(taskBody());
  const result = eligibleTask(packet, {
    claims: [{ id: null, branch: packet.branch, paths: [] }],
  });
  assert.equal(result.eligible, false);
  assert.match(result.reasons.join("|"), /same branch/);
});
test("malformed paths, traversal and partial rename metadata fail closed", () => {
  assert.throws(
    () => changePaths(["../private.env"]),
    /Incomplete changed path/,
  );
  assert.throws(
    () => changePaths(["app\\private.env"]),
    /Incomplete changed path/,
  );
  assert.throws(
    () => changePaths([{ status: "renamed", filename: "new.vue" }]),
    /Incomplete changed path/,
  );
});
test("PAUSED tasks are not falsely READY, but can resume through a claim", () => {
  assert.equal(nextStateLegal("BUILDING", "PAUSED"), true);
  assert.equal(nextStateLegal("PAUSED", "CLAIMED"), true);
  assert.equal(
    eligibleTask({ ...parsePacket(taskBody()), state: "PAUSED" }).eligible,
    false,
  );
});
test("ISO timestamp ordering remains stable", () => {
  assert.ok(
    rankReady(
      { priority: "P1", unlocks: 0, created: "2026-11-19T04:00:00Z" },
      { priority: "P1", unlocks: 0, created: "2026-11-19T05:00:00Z" },
    ) < 0,
  );
});

test("BACKLOG with claimed executor is not an authorized start", () => {
  assert.match(
    validatePacket(
      parsePacket(taskBody({ state: "BACKLOG", executor: "run:987" })),
    ).join("|"),
    /BACKLOG\/READY task must be unclaimed/,
  );
});

test("duplicate authority fields and sections cannot enter the ready queue", () => {
  for (const duplicated of [
    "workstream: Chat 03",
    "### Execution state\nBACKLOG",
    "### Reserved shared paths\nNone.",
    "### Dependencies\n- START: #8",
  ]) {
    const packet = parsePacket(taskBody() + "\n" + duplicated);
    assert.match(
      validatePacket(packet).join("|"),
      /Duplicate packet declaration/,
    );
    assert.equal(eligibleTask(packet).eligible, false);
  }
});

test("duplicate approval and impossible issue numbers are rejected", () => {
  const approval = taskBody().replace(
    "### Acceptance",
    "- External approval: required\n### Acceptance",
  );
  assert.match(
    validatePacket(parsePacket(approval)).join("|"),
    /Invalid external approval/,
  );
  for (const dependency of ["#0", "#9007199254740993"]) {
    assert.match(
      validatePacket(parsePacket(taskBody({ start: dependency }))).join("|"),
      /Invalid dependency ID/,
    );
  }
});

test("normal CRLF works and unsafe path segments fail at declaration and observation", () => {
  assert.deepEqual(
    validatePacket(parsePacket(taskBody().replaceAll("\n", "\r\n"))),
    [],
  );
  for (const path of ["app//file.vue", "app/./file.vue", "app\\file.vue"]) {
    assert.match(
      validatePacket(
        parsePacket(taskBody().replace("app/pages/courses/index.vue", path)),
      ).join("|"),
      /Invalid affected path/,
    );
    assert.throws(() => changePaths([path]), /Incomplete changed path/);
  }
  assert.equal(nextStateLegal("constructor", "READY"), false);
});

test("exact path bullets preserve repository filenames and optional blank lines", () => {
  const owned = [
    "app/pages/courses/[courseSlug].vue",
    "docs/path with spaces.md",
  ];
  const shared = ["docs/one.md", "docs/two.md"];
  const bullets = (entries) =>
    entries.map((path) => "- `" + path + "`").join("\n\n");
  const body = taskBody({ owned: bullets(owned), shared: bullets(shared) });
  for (const newline of ["\n", "\r\n"]) {
    const packet = parsePacket(body.replaceAll("\n", newline));
    assert.deepEqual(packet.owned, owned);
    assert.deepEqual(packet.shared, shared);
    assert.deepEqual(validatePacket(packet), []);
    assert.equal(eligibleTask(packet).eligible, true);
  }
});

test("malformed lines cannot disappear from either path section", () => {
  const valid = "- `app/a.vue`";
  for (const invalid of [
    "- app/b.vue",
    "- ``",
    "- `app/b.vue",
    "app/b.vue",
    "* `app/b.vue`",
    "    - `app/b.vue`",
    "- `app/b.vue` (planned)",
    "- `app/b.vue` `app/c.vue`",
    "<!-- more paths -->",
    "### Other paths\n- `app/b.vue`",
    "- `app/\nb.vue`",
  ]) {
    for (const [key, expected] of [
      ["owned", /Malformed affected path declaration/],
      ["shared", /Malformed shared path declaration/],
    ]) {
      for (const declaration of [
        valid + "\n" + invalid,
        invalid + "\n" + valid,
      ]) {
        const packet = parsePacket(taskBody({ [key]: declaration }));
        assert.match(validatePacket(packet).join("|"), expected, declaration);
        assert.equal(eligibleTask(packet).eligible, false, declaration);
      }
    }
  }
});

test("only the entire shared path section can explicitly declare none", () => {
  for (const shared of ["None", "None.", "\nnone\n"]) {
    const packet = parsePacket(taskBody({ shared }));
    assert.deepEqual(packet.shared, []);
    assert.deepEqual(validatePacket(packet), []);
  }
  for (const shared of [
    "",
    "None required.",
    "None.\n- `app/a.vue`",
    "- `app/a.vue`\nNone",
    "None\nNone.",
  ]) {
    assert.match(
      validatePacket(parsePacket(taskBody({ shared }))).join("|"),
      /shared path declaration/,
    );
  }
  assert.match(
    validatePacket(parsePacket(taskBody({ owned: "None." }))).join("|"),
    /affected path declaration/,
  );
  assert.match(
    validatePacket(parsePacket(taskBody({ owned: "" }))).join("|"),
    /Missing exact affected path/,
  );
});

test("path validation continues to reject unsafe or duplicate entries", () => {
  for (const declaration of [
    "- `../app/a.vue`",
    "- `app/*.vue`",
    "- `app/a.vue`\n- `app/a.vue`",
  ]) {
    for (const key of ["owned", "shared"]) {
      assert.equal(
        eligibleTask(parsePacket(taskBody({ [key]: declaration }))).eligible,
        false,
      );
    }
  }
});

test("filled GitHub issue template accepts exact paths and a subsequent standard heading", () => {
  const template = readFileSync(
    new URL(
      "../../.github/ISSUE_TEMPLATE/parallel-execution-task.md",
      import.meta.url,
    ),
    "utf8",
  );
  const body = template
    .replace("REPLACE_WITH_Work_OR_Chat_03_OR_Chat_01", "Work")
    .replace("REPLACE_WITH_role/task-short-name", "work/task-discovery-check")
    .replace(
      "REPLACE_WITH_Learning_Experience_OR_Technical_Foundation_OR_Quality_Remediation_OR_Governance",
      "Learning Experience",
    )
    .replace("REPLACE_WITH_P0_P1_P2_P3", "P1")
    .replace(
      "REPLACE_WITH_ordinary_OR_shared-interface_OR_sensitive-governance_OR_release-gated",
      "ordinary",
    )
    .replace(
      "One objectively verifiable outcome, with no unrelated feature expansion.",
      "Verify public course discovery using reviewed fixtures.",
    )
    .replace("REPLACE_WITH_actual-file-path", "app/pages/courses/index.vue")
    .replace(
      "- `REPLACE_WITH_exact-shared-path-or-remove-this-bullet`",
      "None.",
    );
  assert.deepEqual(validatePacket(parsePacket(body)), []);
});

test("malformed path metadata also blocks integration readiness despite passing CI and review", () => {
  const packet = parsePacket(
    taskBody({
      state: "READY_TO_INTEGRATE",
      owned: "- `app/a.vue`\n- app/b.vue",
    }),
  );
  const head = "a".repeat(40);
  const base = "b".repeat(40);
  const result = integrationEligible(packet, {
    issueStates: { 24: "DONE" },
    currentBaseSha: base,
    pr: { state: "open", headSha: head, baseSha: base, executor: "agent-A" },
    checks: [{ headSha: head, name: "Development CI", conclusion: "success" }],
    reviews: [
      {
        headSha: head,
        kind: "technical",
        verdict: "accepted",
        reviewer: "agent-B",
      },
    ],
  });
  assert.equal(result.eligible, false);
  assert.match(result.reasons.join("|"), /Malformed affected path declaration/);
});

test("verified and done task packets remain valid after all acceptance boxes are checked", () => {
  for (const state of ["VERIFIED", "DONE"]) {
    const body = taskBody({ state, executor: "fixture-run" }).replaceAll(
      "- [ ]",
      "- [x]",
    );
    assert.deepEqual(validatePacket(parsePacket(body), { number: 99 }), []);
    assert.deepEqual(
      validatePacket(parsePacket(body.replaceAll("- [x]", "- [X]")), {
        number: 99,
      }),
      [],
    );
    assert.match(
      validatePacket(parsePacket(body.replace(/^- \[x\].*$/gm, ""))).join("|"),
      /Missing executor, outcome or acceptance/,
    );
  }
  const active = taskBody({
    state: "PR_OPEN",
    executor: "fixture-run",
  }).replaceAll("- [ ]", "- [x]");
  assert.match(
    validatePacket(parsePacket(active)).join("|"),
    /Missing executor, outcome or acceptance/,
  );
  // Historical terminal packets with open items retain their prior parsing behavior.
  assert.deepEqual(
    validatePacket(
      parsePacket(taskBody({ state: "DONE", executor: "fixture-run" })),
    ),
    [],
  );
});
