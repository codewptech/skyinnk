import assert from "node:assert/strict";
import test from "node:test";
import { parseUniqueJson } from "../scripts/parse-unique-json.ts";

test("unique JSON preserves native values, string escapes and independent nested scopes", () => {
  const examples = [
    '{"a":1,"b":2}',
    '[{"a":1},{"a":2}]',
    '{"a":{"a":3},"b":"{\\"a\\":1,\\"a\\":2}"}',
    '{"\\u0061":1,"b":2}',
    '{"é":1,"e\\u0301":2}',
    "null",
    "1",
    '"a"',
    "true",
    '{"a":[],"b":{}}',
    '{"__proto__":1,"constructor":2}',
    '{"𝑥":2}',
    '{"\\uD835\\uDC65":1}',
    '{"x\\\\":1}',
    '{"a\\"b":1}',
    '{"x" \n\t\r : 1}',
  ];
  for (const source of examples)
    assert.deepEqual(
      parseUniqueJson(source, "fixture"),
      JSON.parse(source),
      source,
    );
  for (const source of ['{"a":1,}', '{"a":"\\x"}', "[] trailing", '{"a":1'])
    assert.throws(() => parseUniqueJson(source, "fixture"), SyntaxError);
});

test("unique JSON detects duplicate decoded keys without printing private key names", () => {
  for (const source of [
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '[{"a":1,"a":2}]',
    '{"__proto__":1,"__proto__":2}',
    '{"𝑥":1,"\\uD835\\uDC65":2}',
    '{"x\\\\":1,"x\\\\":2}',
    '{"a\\"b":1,"a\\"b":2}',
    '{"outer":{"a":1,"a":2}}',
    '{"PRIVATE_REVIEWER_MARKER":1,"PRIVATE_REVIEWER_MARKER":2}',
  ]) {
    assert.throws(
      () => parseUniqueJson(source, "fixture"),
      (error) =>
        error instanceof SyntaxError &&
        error.message === "fixture: duplicate JSON object member",
    );
  }
});

test("unique JSON scanner handles deep native JSON and deterministic escaped-string round trips", () => {
  const depth = 30_000;
  assert.doesNotThrow(() =>
    parseUniqueJson("[".repeat(depth) + "0" + "]".repeat(depth), "fixture"),
  );
  for (let i = 0; i < 500; i++) {
    const value = {
      s: JSON.stringify({ a: i, b: '\\"{}[]:,\r\n𝑥' }),
      a: [
        { b: i, c: String(i) + "\\" },
        { b: i + 1, c: '"a"' },
      ],
      n: i / 7,
    };
    const raw = JSON.stringify(value, null, i % 4);
    assert.deepEqual(parseUniqueJson(raw, "fixture"), value);
  }
});
