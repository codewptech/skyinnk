import assert from "node:assert/strict";
import { test } from "node:test";
import { syllabusAccessibleNames } from "../app/utils/syllabus-link-labels.ts";

const lesson = (key, title, kind, position) => ({
  key,
  slug: key,
  title,
  kind,
  position,
});

test("syllabus retains its existing short names when links are unambiguous", () => {
  const labels = syllabusAccessibleNames([
    {
      key: "module-a",
      title: "Module one",
      position: 0,
      lessons: [
        lesson("video", "Foundations", "video", 0),
        lesson("text", "Practice", "text", 1),
        lesson("different-kind", "Foundations", "text", 2),
      ],
    },
  ]);

  assert.equal(labels.get("video"), "Foundations, Video lesson");
  assert.equal(labels.get("text"), "Practice, Text lesson");
  assert.equal(labels.get("different-kind"), "Foundations, Text lesson");
  assert.equal(labels.size, 3);
});

test("identical lesson titles and kinds have distinct module-aware accessible names", () => {
  const labels = syllabusAccessibleNames([
    {
      key: "module-later",
      title: "Repeated module",
      position: 10,
      lessons: [
        lesson("third", "Introduction", "text", 0),
      ],
    },
    {
      key: "module-first",
      title: "Repeated module",
      position: 2,
      lessons: [
        lesson("second", "Introduction", "text", 5),
        lesson("first", "Introduction", "text", 0),
      ],
    },
  ]);

  assert.equal(
    labels.get("first"),
    "Introduction, Repeated module (module 1, lesson 1), Text lesson",
  );
  assert.equal(
    labels.get("second"),
    "Introduction, Repeated module (module 1, lesson 2), Text lesson",
  );
  assert.equal(
    labels.get("third"),
    "Introduction, Repeated module (module 2, lesson 1), Text lesson",
  );
  assert.equal(new Set(labels.values()).size, 3);
  assert.equal(labels.size, 3);
});

test("syllabus labels stay stable when the caller supplies modules in a different order", () => {
  const modules = [
    {
      key: "later",
      title: "Second",
      position: 8,
      lessons: [lesson("later-lesson", "Overview", "text", 0)],
    },
    {
      key: "earlier",
      title: "First",
      position: 0,
      lessons: [lesson("earlier-lesson", "Overview", "text", 0)],
    },
  ];
  assert.deepEqual(
    [...syllabusAccessibleNames(modules)],
    [...syllabusAccessibleNames([...modules].reverse())],
  );
});
