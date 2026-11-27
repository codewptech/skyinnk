<script setup lang="ts">
import { uniqueAccessibleNames } from "../../../utils/unique-accessible-names";
import { findPublicCourse } from "../../../utils/public-catalogue";
const route = useRoute();
definePageMeta({ key: (route) => String(route.params.courseSlug) });
const slug = String(route.params.courseSlug ?? "");
const course = findPublicCourse(slug);
if (!course)
  throw createError({ statusCode: 404, statusMessage: "Course not published" });
const orderedModules = [...course.modules].sort(
  (a, b) => a.position - b.position,
);
const lessonTitleIdentity = (title: string) => title.trim().replace(/\s+/gu, " ").normalize("NFC").toLowerCase().normalize("NFC");
const lessonTitleCounts = new Map<string, number>();
for (const module of orderedModules)
  for (const lesson of module.lessons)
    lessonTitleCounts.set(
      lessonTitleIdentity(lesson.title),
      (lessonTitleCounts.get(lessonTitleIdentity(lesson.title)) ?? 0) + 1,
    );

// Course links show only the lesson title. If it repeats, provide module and
// ordered position context while keeping the visible link text unchanged.
function accessibleLessonName(
  title: string,
  moduleTitle: string,
  moduleIndex: number,
  lessonIndex: number,
): string | undefined {
  if ((lessonTitleCounts.get(lessonTitleIdentity(title)) ?? 0) < 2) return undefined;
  return `${title.trim().replace(/\s+/gu, " ")}, ${moduleTitle} (module ${moduleIndex + 1}, lesson ${lessonIndex + 1})`;
}
const orderedEntries = orderedModules.flatMap((module, moduleIndex) =>
  [...module.lessons].sort((a, b) => a.position - b.position).map((lesson, lessonIndex) => ({
    lesson,
    name: accessibleLessonName(lesson.title, module.title, moduleIndex, lessonIndex) ?? lesson.title,
  })),
);
const finalNames = uniqueAccessibleNames(orderedEntries.map(entry => entry.name));
const lessonNames = new Map(orderedEntries.map(({ lesson }, index) => [
  lesson.key,
  finalNames[index] === lesson.title ? undefined : finalNames[index],
]));
useHead({
  title: `${course.title} | Skyinnk`,
  link: [
    { rel: "canonical", href: `https://www.skyinnk.in/courses/${course.slug}` },
  ],
  meta: [
    { name: "description", content: course.summary },
    { property: "og:title", content: course.title },
    { property: "og:description", content: course.summary },
    { property: "og:type", content: "website" },
  ],
});
</script>
<template>
  <main id="main-content" class="course">
    <header class="learning-nav"><NuxtLink class="learning-brand" to="/"><span class="brand-mark" aria-hidden="true">S</span>Skyinnk</NuxtLink><NuxtLink to="/courses">All courses</NuxtLink></header>
    <div class="course-hero"><div><p class="section-kicker">Course overview</p><h1>{{ course.title }}</h1><p class="course-summary">{{ course.summary }}</p></div><div class="course-facts"><span class="section-kicker">Learning at a glance</span><strong>{{ orderedEntries.length }} {{ orderedEntries.length === 1 ? "lesson" : "lessons" }}</strong><span>For: {{ course.audience }}</span><span>Public lessons · No account required</span></div></div>
    <div class="outline-heading"><p class="section-kicker">Learning path</p><h2>Course syllabus</h2></div>
    <section
      v-for="(module, moduleIndex) in orderedModules"
      :key="module.key"
      class="module-card"
    >
      <div class="module-heading"><span class="module-number" aria-hidden="true">{{ String(moduleIndex + 1).padStart(2, "0") }}</span><h3>{{ module.title }}</h3></div>
      <ol>
        <li
          v-for="lesson in [...module.lessons].sort(
            (a, b) => a.position - b.position,
          )"
          :key="lesson.key"
        >
          <NuxtLink
            :to="`/courses/${course.slug}/lessons/${lesson.slug}`"
            :aria-label="lessonNames.get(lesson.key)"
          >{{ lesson.title }}</NuxtLink>
        </li>
      </ol>
    </section>
  </main>
</template>
<style scoped>
.course { width: min(100%, var(--page-width) + 2 * var(--gutter)); margin: 0 auto; padding: 1.25rem var(--gutter) 4rem; }
.course-hero { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(0,1fr); gap: 1.5rem; align-items: center; padding: clamp(1.4rem,4vw,3rem); background: var(--soft); border-radius: 1.5rem; }
.course-hero h1 { font-size: clamp(2rem,4.5vw,3.8rem); letter-spacing: -.055em; margin: 0 0 1rem; }
.course-summary { margin: 0; color: var(--muted); font-size: 1.08rem; white-space: pre-line; }
.course-facts { padding: 1.2rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); display: flex; flex-direction: column; gap: .65rem; color: var(--muted); min-width: 0; overflow-wrap: anywhere; }
.course-facts .section-kicker { margin: 0; }
.course-facts strong { color: var(--ink); font-size: 1.5rem; }
.outline-heading { margin: 2.5rem 0 1rem; }
.outline-heading h2 { margin: 0; font-size: clamp(1.5rem,3vw,2.1rem); }
.module-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 1rem; padding: 1.2rem 1.4rem; box-shadow: var(--shadow); }
.module-heading { display: flex; align-items: center; gap: 1rem; margin-bottom: .75rem; }
.module-heading h3 { margin: 0; font-size: 1.25rem; }
.module-number { flex: 0 0 auto; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; background: var(--soft); color: var(--brand); border-radius: .75rem; font-weight: 750; }
ol { list-style: none; padding: 0; margin: 0; }
li { border-top: 1px solid var(--line); }
li a { position: relative; display: flex; align-items: center; min-height: 54px; text-decoration: none; color: var(--brand); font-weight: 650; padding: .65rem 2rem .65rem .65rem; overflow-wrap: anywhere; }
li a:hover { background: var(--soft); border-radius: .5rem; }
li a::after { content: ""; position: absolute; right: .85rem; top: calc(50% - .24rem); width: .48rem; height: .48rem; border-top: 2px solid currentColor; border-right: 2px solid currentColor; transform: rotate(45deg); }
@media (max-width: 700px) { .course-hero { grid-template-columns: 1fr; } .module-card { padding: 1rem; } }
</style>
