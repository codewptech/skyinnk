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
const lessonTitleIdentity = (title: string) => title.trim().replace(/\s+/gu, " ").toLowerCase();
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
    <NuxtLink to="/courses">All courses</NuxtLink>
    <h1>{{ course.title }}</h1>
    <p>{{ course.summary }}</p>
    <p>For: {{ course.audience }}</p>
    <p>Public lessons · No account required</p>
    <section
      v-for="module in orderedModules"
      :key="module.key"
    >
      <h2>{{ module.title }}</h2>
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
          >{{
            lesson.title
          }}</NuxtLink>
        </li>
      </ol>
    </section>
  </main>
</template>
<style scoped>
.course {
  flex: 1;
  max-width: 1000px;
  width: calc(100% - 3rem);
  margin: 2rem auto;
  color: #17233a;
}
.course section {
  margin-top: 2rem;
  border-top: 1px solid #d7e1ef;
}
p {
  line-height: 1.6;
  color: #485a73;
}
a {
  color: #164b96;
}
li {
  margin: 0.9rem 0;
}
</style>
