import type { PublicCourse } from "../../shared/public-content";

/** Preserve ordinary labels; disambiguate equal titles in displayed course order. */
export function courseSyllabusLinkLabels(
  courses: readonly Pick<PublicCourse, "title">[],
): string[] {
  const totals = new Map<string, number>();
  for (const course of courses) {
    totals.set(course.title, (totals.get(course.title) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return courses.map(({ title }) => {
    const original = `View syllabus: ${title}`;
    if (totals.get(title) === 1) return original;
    const occurrence = (seen.get(title) ?? 0) + 1;
    seen.set(title, occurrence);
    return `${original} (course ${occurrence} of ${totals.get(title)})`;
  });
}
