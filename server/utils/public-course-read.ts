import { validatePublicCatalogue, type PublicCourse } from "../../shared/public-content.ts";

const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function publishedCourses(courses: PublicCourse[]): PublicCourse[] {
  // The build validates the authored manifest and physical resources. Repeat
  // the publication/type validation at the API boundary: fail closed on drafts.
  return validatePublicCatalogue({ schemaVersion: 1, courses }).courses;
}

function byPosition<T extends { position: number }>(a: T, b: T) {
  return a.position - b.position;
}

/** Public-only, intentionally narrow response: no notes, reviews or user data. */
export function listPublicCourseSummaries(courses: PublicCourse[]) {
  return {
    courses: publishedCourses(courses).map((course) => ({
      key: course.key,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      audience: course.audience,
      subject: course.subject,
      moduleCount: course.modules.length,
      lessonCount: course.modules.reduce((count, module) => count + module.lessons.length, 0),
    })),
  };
}

/** Public course detail intentionally omits lesson notes and media. */
export function readPublicCourseOutline(courses: PublicCourse[], slug: string) {
  const released = publishedCourses(courses);
  if (!keyPattern.test(slug)) return undefined;
  const course = released.find((item) => item.slug === slug);
  if (!course) return undefined;
  return {
    course: {
      key: course.key,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      audience: course.audience,
      subject: course.subject,
      modules: [...course.modules].sort(byPosition).map((module) => ({
        key: module.key,
        title: module.title,
        position: module.position,
        lessons: [...module.lessons].sort(byPosition).map((lesson) => ({
          key: lesson.key,
          slug: lesson.slug,
          title: lesson.title,
          kind: lesson.kind,
          position: lesson.position,
          overview: lesson.overview,
        })),
      })),
    },
  };
}

/** Complete released lesson, but only explicitly public fields. */
export function readPublicLesson(
  courses: PublicCourse[],
  courseSlug: string,
  lessonSlug: string,
) {
  const released = publishedCourses(courses);
  if (!keyPattern.test(courseSlug) || !keyPattern.test(lessonSlug)) return undefined;
  const course = released.find((item) => item.slug === courseSlug);
  if (!course) return undefined;
  for (const module of [...course.modules].sort(byPosition)) {
    const lesson = module.lessons.find((item) => item.slug === lessonSlug);
    if (!lesson) continue;
    return {
      course: {
        key: course.key,
        slug: course.slug,
        title: course.title,
        subject: course.subject,
      },
      module: {
        key: module.key,
        title: module.title,
        position: module.position,
      },
      lesson: {
        key: lesson.key,
        slug: lesson.slug,
        title: lesson.title,
        kind: lesson.kind,
        position: lesson.position,
        overview: lesson.overview,
        notesMarkdown: lesson.notesMarkdown,
        ...(lesson.video
          ? { video: { provider: lesson.video.provider, publicId: lesson.video.publicId } }
          : {}),
        resources: (lesson.resources ?? []).map((resource) => ({
          key: resource.key,
          title: resource.title,
          url: resource.url,
          type: resource.type,
          sizeBytes: resource.sizeBytes,
        })),
      },
    };
  }
  return undefined;
}
