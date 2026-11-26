import { uniqueAccessibleNames } from "./unique-accessible-names.ts";
import type { PublicCourse } from "../../shared/public-content";

/** Preserve ordinary labels; disambiguate equal titles in displayed course order. */
export function courseSyllabusLinkLabels(
  courses: readonly Pick<PublicCourse, "title">[],
): string[] {
  const identity = (title: string) => title.trim().replace(/\s+/gu, " ").toLowerCase();
  const totals = new Map<string, number>();
  for (const course of courses) {
    const key = identity(course.title);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return uniqueAccessibleNames(courses.map(({ title }) => {
    const key = identity(title);
    const original = `View syllabus: ${title}`;
    if (totals.get(key) === 1) return original;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return `View syllabus: ${title.trim().replace(/\s+/gu, " ")} (course ${occurrence} of ${totals.get(key)})`;
  }));
}
