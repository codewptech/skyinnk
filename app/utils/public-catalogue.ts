import type { LearnerCourse, LearnerLesson } from "../../shared/public-content";
export type {
  LearnerCourse as PublicCourse,
  LearnerModule as PublicModule,
  LearnerLesson as PublicLesson,
  LearnerResource as PublicResource,
} from "../../shared/public-content";

// Vite injects only the validated, explicitly projected learner-facing data.
declare const __SKYINNK_LEARNER_COURSES__: LearnerCourse[];
const courses = __SKYINNK_LEARNER_COURSES__;
export function listPublicCourses(): LearnerCourse[] {
  return courses;
}
export function findPublicCourse(slug: string): LearnerCourse | undefined {
  return courses.find((course) => course.slug === slug);
}
export function orderedPublicLessons(course: LearnerCourse): LearnerLesson[] {
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
