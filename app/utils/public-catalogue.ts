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

type CataloguePreview = { enabled: boolean; courses: LearnerCourse[] };

/** Preserve the existing built-server projection; never serialize raw catalogue
 * Markdown into a production Nuxt async-data payload. Development SSR uses
 * the original HTTP event's guarded loader, not a synthetic internal fetch. */
export function useLearningCatalogue() {
  const fallback: CataloguePreview = { enabled: false, courses };
  if (!import.meta.dev) {
    return { data: shallowRef(fallback), error: shallowRef(null) };
  }
  const event = import.meta.server ? useRequestEvent() : undefined;
  const request = useRequestFetch();
  return useAsyncData<CataloguePreview>("learning-catalogue", async () => {
    const load = event?.context.skyinnkDevelopmentCatalogue as
      | (() => Promise<CataloguePreview>)
      | undefined;
    const preview = import.meta.server
      ? await load?.()
      : await request<CataloguePreview>("/api/v1/development/catalogue");
    return preview?.enabled ? preview : fallback;
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
