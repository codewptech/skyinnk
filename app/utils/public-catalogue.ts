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

/** The development-only route never modifies or impersonates a public release. */
export function useLearningCatalogue() {
  const request = useRequestFetch();
  return useAsyncData("learning-catalogue", async () => {
    if (import.meta.dev) {
      const preview = await request<{ enabled: boolean; courses: LearnerCourse[] }>("/api/v1/development/catalogue");
      if (preview.enabled) return preview;
    }
    return { enabled: false, courses };
  });
}
export function listPublicCourses(): LearnerCourse[] {
  return courses;
}
export function findPublicCourse(slug: string, catalogue = courses): LearnerCourse | undefined {
  return catalogue.find((course) => course.slug === slug);
}
export function orderedPublicLessons(course: LearnerCourse): LearnerLesson[] {
  return [...course.modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      [...module.lessons].sort((a, b) => a.position - b.position),
    );
}
export function findPublicLesson(courseSlug: string, lessonSlug: string, catalogue = courses) {
  const course = findPublicCourse(courseSlug, catalogue);
  if (!course) return undefined;
  const lesson = orderedPublicLessons(course).find(
    (entry) => entry.slug === lessonSlug,
  );
  return lesson ? { course, lesson } : undefined;
}
