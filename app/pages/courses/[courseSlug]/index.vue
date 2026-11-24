<script setup lang="ts">
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
const lessonTitleCounts = new Map<string, number>();
for (const module of orderedModules)
  for (const lesson of module.lessons)
    lessonTitleCounts.set(
      lesson.title,
      (lessonTitleCounts.get(lesson.title) ?? 0) + 1,
    );

// Course links show only the lesson title. If it repeats, provide module and
// ordered position context while keeping the visible link text unchanged.
function accessibleLessonName(
  title: string,
  moduleTitle: string,
  moduleIndex: number,
  lessonIndex: number,
): string | undefined {
  if ((lessonTitleCounts.get(title) ?? 0) < 2) return undefined;
  return `${title}, ${moduleTitle} (module ${moduleIndex + 1}, lesson ${lessonIndex + 1})`;
}
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
      v-for="(module, moduleIndex) in orderedModules"
      :key="module.key"
    >
      <h2>{{ module.title }}</h2>
      <ol>
        <li
          v-for="(lesson, lessonIndex) in [...module.lessons].sort(
            (a, b) => a.position - b.position,
          )"
          :key="lesson.key"
        >
          <NuxtLink
            :to="`/courses/${course.slug}/lessons/${lesson.slug}`"
            :aria-label="accessibleLessonName(lesson.title, module.title, moduleIndex, lessonIndex)"
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
