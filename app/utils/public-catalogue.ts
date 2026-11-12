import catalogue from "../../content/catalogue.json";
import type { PublicCourse, PublicLesson } from "../../shared/public-content";
export type {
  PublicCourse,
  PublicModule,
  PublicLesson,
  PublicResource,
} from "../../shared/public-content";
// nuxt.config.ts validates every record and physical resource before dev/build.
const courses = catalogue.courses as PublicCourse[];
export function listPublicCourses(): PublicCourse[] {
  return courses;
}
export function findPublicCourse(slug: string): PublicCourse | undefined {
  return courses.find((course) => course.slug === slug);
}
export function orderedPublicLessons(course: PublicCourse): PublicLesson[] {
  return [...course.modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      [...module.lessons].sort((a, b) => a.position - b.position),
    );
}
export function findPublicLesson(courseSlug: string, lessonSlug: string) {
  const course = findPublicCourse(courseSlug);
  if (!course) return undefined;
  const lesson = orderedPublicLessons(course).find(
    (entry) => entry.slug === lessonSlug,
  );
  return lesson ? { course, lesson } : undefined;
}
