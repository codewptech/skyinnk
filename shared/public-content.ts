/** Source migration keys are not database IDs. Every imported record is public. */
export type Publication = {
  status: "published";
  visibility: "public";
  reviewedBy: string;
  reviewedAt: string;
};
export type PublicResource = {
  key: string;
  title: string;
  url: string;
  type: string;
  sizeBytes: number;
  publication: Publication;
};
export type PublicLesson = {
  key: string;
  slug: string;
  title: string;
  position: number;
  kind: "video" | "text";
  overview: string;
  notesMarkdown: string;
  publication: Publication;
  video?: { provider: "youtube"; publicId: string };
  resources?: PublicResource[];
};
export type PublicModule = {
  key: string;
  title: string;
  position: number;
  lessons: PublicLesson[];
};
export type PublicCourse = {
  key: string;
  slug: string;
  title: string;
  summary: string;
  audience: string;
  subject: string;
  publication: Publication;
  modules: PublicModule[];
};
export type PublicCatalogue = { schemaVersion: 1; courses: PublicCourse[] };
const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const publicPath =
  /^\/resources\/public\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:pdf|txt|png|jpg|jpeg|webp)$/;
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Public content: ${message}`);
}
function record(
  value: unknown,
  fields: string[],
  context: string,
): asserts value is Record<string, unknown> {
  ensure(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${context} must be an object`,
  );
  ensure(
    Object.keys(value).every((key) => fields.includes(key)),
    `${context} has an unsupported field`,
  );
}
function text(value: unknown, context: string) {
  ensure(
    typeof value === "string" && value.trim().length > 0,
    `${context} is required`,
  );
}
function publication(value: unknown, context: string) {
  record(
    value,
    ["status", "visibility", "reviewedBy", "reviewedAt"],
    `${context}.publication`,
  );
  ensure(
    value.status === "published" && value.visibility === "public",
    `${context} must be explicitly published and public`,
  );
  text(value.reviewedBy, `${context}.reviewedBy`);
  ensure(
    typeof value.reviewedAt === "string" &&
      /^\d{4}-\d\d-\d\dT/.test(value.reviewedAt) &&
      Number.isFinite(Date.parse(value.reviewedAt)),
    `${context} needs an ISO review timestamp`,
  );
}
function unique(value: unknown, seen: Set<string>, context: string) {
  ensure(
    typeof value === "string" && keyPattern.test(value),
    `${context} must be a safe source key/slug`,
  );
  ensure(!seen.has(value), `${context} must be unique`);
  seen.add(value);
}
function position(value: unknown, seen: Set<number>, context: string) {
  ensure(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      !seen.has(value),
    `${context} must be a unique nonnegative position`,
  );
  seen.add(value);
}
/** Fail the build on drafts, unsafe paths, ambiguous routes or accidental private fields. */
export function validatePublicCatalogue(value: unknown): PublicCatalogue {
  record(value, ["schemaVersion", "courses"], "catalogue");
  ensure(
    value.schemaVersion === 1 && Array.isArray(value.courses),
    "schemaVersion 1 and courses array required",
  );
  const keys = new Set<string>(),
    courseSlugs = new Set<string>();
  const resourceRecords = new Map<string, string>();
  for (const course of value.courses) {
    record(
      course,
      [
        "key",
        "slug",
        "title",
        "summary",
        "audience",
        "subject",
        "publication",
        "modules",
      ],
      "course",
    );
    unique(course.key, keys, "course.key");
    unique(course.slug, courseSlugs, "course.slug");
    for (const field of ["title", "summary", "audience", "subject"])
      text(course[field], `course.${field}`);
    publication(course.publication, "course");
    ensure(
      Array.isArray(course.modules) && course.modules.length > 0,
      "listed course needs a released module",
    );
    const modulePositions = new Set<number>(),
      lessonSlugs = new Set<string>();
    for (const module of course.modules) {
      record(module, ["key", "title", "position", "lessons"], "module");
      unique(module.key, keys, "module.key");
      text(module.title, "module.title");
      position(module.position, modulePositions, "module.position");
      ensure(
        Array.isArray(module.lessons) && module.lessons.length > 0,
        "module needs a released lesson",
      );
      const lessonPositions = new Set<number>();
      for (const lesson of module.lessons) {
        record(
          lesson,
          [
            "key",
            "slug",
            "title",
            "position",
            "kind",
            "overview",
            "notesMarkdown",
            "publication",
            "video",
            "resources",
          ],
          "lesson",
        );
        unique(lesson.key, keys, "lesson.key");
        unique(lesson.slug, lessonSlugs, "lesson.slug");
        position(lesson.position, lessonPositions, "lesson.position");
        text(lesson.title, "lesson.title");
        text(lesson.overview, "lesson.overview");
        ensure(
          typeof lesson.notesMarkdown === "string",
          "notesMarkdown must be a string",
        );
        publication(lesson.publication, "lesson");
        ensure(
          lesson.kind === "video" || lesson.kind === "text",
          "lesson kind must be video or text",
        );
        if (lesson.kind === "video") {
          record(lesson.video, ["provider", "publicId"], "video");
          ensure(
            lesson.video.provider === "youtube" &&
              typeof lesson.video.publicId === "string" &&
              /^[a-zA-Z0-9_-]{11}$/.test(lesson.video.publicId),
            "video needs a reviewed YouTube ID",
          );
        } else {
          ensure(
            lesson.video === undefined,
            "text lesson cannot contain a video",
          );
          text(lesson.notesMarkdown, "text lesson notes");
        }
        if (lesson.resources !== undefined) {
          ensure(Array.isArray(lesson.resources), "resources must be an array");
          for (const resource of lesson.resources) {
            record(
              resource,
              ["key", "title", "url", "type", "sizeBytes", "publication"],
              "resource",
            );
            text(resource.title, "resource.title");
            ensure(
              typeof resource.url === "string" && publicPath.test(resource.url),
              "resource needs an approved local public path and safe file type",
            );
            ensure(
              resource.type ===
                String(resource.url).split(".").at(-1)?.toUpperCase(),
              "resource type must match its extension",
            );
            ensure(
              typeof resource.sizeBytes === "number" &&
                Number.isSafeInteger(resource.sizeBytes) &&
                resource.sizeBytes > 0,
              "resource sizeBytes must be positive",
            );
            publication(resource.publication, "resource");
            const review = resource.publication as Record<string, unknown>;
            const signature = JSON.stringify([
              resource.title,
              resource.url,
              resource.type,
              resource.sizeBytes,
              review.status,
              review.visibility,
              review.reviewedBy,
              review.reviewedAt,
            ]);
            if (
              typeof resource.key === "string" &&
              resourceRecords.has(resource.key)
            )
              ensure(
                resourceRecords.get(resource.key) === signature,
                "reused resource must preserve its reviewed metadata",
              );
            else {
              unique(resource.key, keys, "resource.key");
              resourceRecords.set(resource.key as string, signature);
            }
          }
        }
      }
    }
  }
  return value as unknown as PublicCatalogue;
}
