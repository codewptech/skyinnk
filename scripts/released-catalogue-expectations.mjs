import { validatePublicCatalogue } from "../shared/public-content.ts";
import { readFile, cp } from "node:fs/promises";
import { relative, sep } from "node:path";

const normalize = (value) => value.trim().replace(/\s+/gu, " ");
const identity = (value) =>
  normalize(value).normalize("NFC").toLowerCase().normalize("NFC");
const order = (a, b) => a.position - b.position;
const counts = (values) => {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
};

/** Resolve final collisions independently of the application's label helper.
 * All first-pass names are reserved, including suffix-shaped literal titles. */
function finalizeLinkNames(items) {
  const occupied = new Set(items.map((item) => identity(item.linkName)));
  const occurrences = new Set();
  for (const item of items) {
    const key = identity(item.linkName);
    if (!occurrences.has(key)) {
      occurrences.add(key);
      continue;
    }
    let ordinal = 2;
    let name;
    do {
      name = item.linkName + " (link " + ordinal++ + ")";
    } while (occupied.has(identity(name)));
    occupied.add(identity(name));
    item.linkName = name;
  }
  return items;
}

/** Independent test expectations from the reviewed source, not from a live API. */
export function releaseExpectations(value) {
  const { courses } = validatePublicCatalogue(value);
  const courseCounts = counts(courses.map((course) => identity(course.title)));
  const seen = new Map();
  return finalizeLinkNames(
    courses.map((course) => {
      const coursePath = "/courses/" + course.slug;
      const key = identity(course.title);
      const ordinal = (seen.get(key) ?? 0) + 1;
      seen.set(key, ordinal);
      const modules = [...course.modules].sort(order);
      const lessonCounts = counts(
        modules.flatMap((module) =>
          module.lessons.map((lesson) => identity(lesson.title)),
        ),
      );
      const lessons = modules.flatMap((module, mi) =>
        [...module.lessons].sort(order).map((lesson, li) => ({
          slug: lesson.slug,
          title: normalize(lesson.title),
          path: coursePath + "/lessons/" + lesson.slug,
          linkName:
            lessonCounts.get(identity(lesson.title)) > 1
              ? normalize(lesson.title) +
                ", " +
                normalize(module.title) +
                " (module " +
                (mi + 1) +
                ", lesson " +
                (li + 1) +
                ")"
              : normalize(lesson.title),
          kind: lesson.kind,
          hasNotes: !!lesson.notesMarkdown,
          resources: (lesson.resources ?? []).map(
            ({ url, type, sizeBytes, sha256 }) => ({
              url,
              type,
              sizeBytes,
              sha256,
            }),
          ),
        })),
      );
      return {
        slug: course.slug,
        title: normalize(course.title),
        path: coursePath,
        linkName:
          "View syllabus: " +
          normalize(course.title) +
          (courseCounts.get(key) > 1
            ? " (course " + ordinal + " of " + courseCounts.get(key) + ")"
            : ""),
        summary: {
          key: course.key,
          slug: course.slug,
          title: course.title,
          summary: course.summary,
          audience: course.audience,
          subject: course.subject,
          moduleCount: modules.length,
          lessonCount: lessons.length,
        },
        lessons: finalizeLinkNames(lessons),
      };
    }),
  );
}

export async function readReleaseExpectations(path) {
  return releaseExpectations(JSON.parse(await readFile(path, "utf8")));
}

/** Copy source into an isolated fixture without real public resources or secrets. */
export function fixtureSourceIncluded(project, source) {
  const path = relative(project, source).split(sep).join("/");
  if (path === "public/resources" || path.startsWith("public/resources/"))
    return false;
  return !path
    .split("/")
    .some(
      (part) =>
        ["node_modules", ".git", ".nuxt", ".output"].includes(part) ||
        /^\.env(?:\.|$)/.test(part),
    );
}
export async function copyFixtureSource(project, destination) {
  await cp(project, destination, {
    recursive: true,
    filter: (source) => fixtureSourceIncluded(project, source),
  });
}
