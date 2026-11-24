import type { PublicModule } from "./public-catalogue";

// Public lesson titles need not be unique. Keep the short, familiar accessible
// name for unique links, but identify the actual module and lesson when names
// would collide in a screen reader's links list.
export function syllabusAccessibleNames(
  modules: readonly PublicModule[],
): Map<string, string> {
  const entries = [...modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module, moduleIndex) =>
      [...module.lessons]
        .sort((a, b) => a.position - b.position)
        .map((lesson, lessonIndex) => ({
          module,
          moduleIndex,
          lesson,
          lessonIndex,
          type: lesson.kind === "video" ? "Video lesson" : "Text lesson",
        })),
    );

  const normalizeLabel = (value: string) => value.trim().replace(/\s+/gu, " ").toLowerCase();
  const counts = new Map<string, number>();
  for (const { lesson, type } of entries) {
    const baseName = `${lesson.title}, ${type}`;
    const identity = normalizeLabel(baseName);
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  }

  const names = new Map<string, string>();
  for (const { module, moduleIndex, lesson, lessonIndex, type } of entries) {
    const baseName = `${lesson.title}, ${type}`;
    const name =
      (counts.get(normalizeLabel(baseName)) ?? 0) > 1
        ? `${lesson.title.trim().replace(/\s+/gu, " ")}, ${module.title} (module ${moduleIndex + 1}, lesson ${lessonIndex + 1}), ${type}`
        : baseName;
    names.set(lesson.key, name);
  }
  return names;
}
