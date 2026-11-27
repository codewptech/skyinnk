<script setup lang="ts">
import { useLearningCatalogue } from "../../utils/public-catalogue";
import { courseSyllabusLinkLabels } from "../../utils/course-link-labels";
const { data: catalogue, error: catalogueError } = await useLearningCatalogue();
if (catalogueError.value || !catalogue.value)
  throw createError({ statusCode: 503, statusMessage: "Learning catalogue temporarily unavailable" });
const courses = catalogue.value.courses;
const developmentCatalogue = catalogue.value.enabled;
if (developmentCatalogue) useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
const courseLinkNames = courseSyllabusLinkLabels(courses);
useHead({
  title: "Courses | Skyinnk",
  link: [{ rel: "canonical", href: "https://www.skyinnk.in/courses" }],
  meta: [
    {
      name: "description",
      content: "Browse published free lessons and school courses on Skyinnk.",
    },
    { property: "og:title", content: "Explore courses | Skyinnk" },
    {
      property: "og:description",
      content: "Browse educator-reviewed public learning material on Skyinnk.",
    },
    { property: "og:url", content: "https://www.skyinnk.in/courses" },
  ],
});
</script>
<template>
  <main id="main-content" class="catalogue">
    <header class="learning-nav">
      <NuxtLink class="learning-brand" to="/"
        ><span class="brand-mark" aria-hidden="true">S</span>Skyinnk<span
          class="home-label"
        >
          / Home</span
        ></NuxtLink
      ><span class="library-label">Public learning library</span>
    </header>
    <section class="catalogue-heading" aria-labelledby="catalogue-title">
      <p class="section-kicker">Learning library</p>
      <h1 id="catalogue-title">Explore courses</h1>
      <p>{{ developmentCatalogue ? "Browse available courses and learning materials." : "Published learning material is available without registration." }}</p>
    </section>
    <div v-if="courses.length" class="grid">
      <article v-for="(course, courseIndex) in courses" :key="course.key">
        <div class="course-illustration" aria-hidden="true">
          <span>▤</span><span class="course-decoration">✳</span>
        </div>
        <div class="course-body">
          <p class="section-kicker">{{ developmentCatalogue ? "Course" : "Public course" }}</p>
          <h2>{{ course.title }}</h2>
          <p>{{ course.summary }}</p>
          <NuxtLink
            :to="`/courses/${course.slug}`"
            :aria-label="courseLinkNames[courseIndex]"
            class="course-link"
          >
            View syllabus
          </NuxtLink>
        </div>
      </article>
    </div>
    <section v-else class="empty-state"  :aria-label="developmentCatalogue ? 'No courses' : 'No published courses'">
      <div class="empty-icon" aria-hidden="true">▤</div>
      <p class="section-kicker">{{ developmentCatalogue ? "No courses yet" : "No published courses yet" }}</p>
      <h2>Lessons are being prepared</h2>
      <p v-if="developmentCatalogue">There are no courses to browse yet.</p>
      <p v-else>
        We will list courses here as soon as substantive, educator-reviewed
        lessons are published. There are no published courses to browse yet.
      </p>
    </section>
  </main>
</template>
<style scoped>
.catalogue {
  width: min(100%, var(--page-width) + 2 * var(--gutter));
  margin: 0 auto;
  padding: 1.25rem var(--gutter) 4rem;
}
.catalogue-heading {
  border-radius: 1.5rem;
  padding: clamp(1.5rem, 5vw, 3rem);
  background: var(--soft);
  color: var(--ink);
}
.catalogue-heading h1 {
  font-size: clamp(2.3rem, 5vw, 4rem);
  letter-spacing: -0.06em;
  margin: 0.2rem 0 0.8rem;
}
.catalogue-heading > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 1.08rem;
  max-width: 40rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  gap: 1.25rem;
  margin-top: 2rem;
}
.grid article {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.course-illustration {
  height: 7rem;
  background: var(--mint);
  color: #235b44;
  padding: 1.1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 2.8rem;
}
.grid article:nth-child(3n + 2) .course-illustration {
  background: var(--soft);
  color: var(--brand);
}
.grid article:nth-child(3n + 3) .course-illustration {
  background: var(--amber);
  color: #684417;
}
.course-decoration {
  font-size: 4rem;
  opacity: 0.55;
}
.course-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.4rem;
  min-width: 0;
}
.course-body h2 {
  font-size: 1.4rem;
  margin: 0;
}
.course-body > p:not(.section-kicker) {
  color: var(--muted);
  margin: 0.7rem 0 1rem;
}
.course-link {
  position: relative;
  color: var(--brand);
  font-weight: 700;
  display: flex;
  align-items: center;
  padding: 0.8rem 1.5rem 0.8rem 0;
  min-height: 44px;
  border-top: 1px solid var(--line);
  margin-top: auto;
}
.course-link::after {
  content: "";
  position: absolute;
  right: 0.35rem;
  top: calc(50% - 0.24rem);
  width: 0.48rem;
  height: 0.48rem;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(45deg);
}
.home-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.library-label {
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--muted);
}
.empty-state {
  margin: 2rem 0;
  border: 1px dashed #b9bbd0;
  border-radius: var(--radius);
  padding: clamp(1.5rem, 6vw, 4rem);
  background: var(--surface);
  text-align: center;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto 1.25rem;
  background: var(--soft);
  color: var(--brand);
  border-radius: 1rem;
  font-size: 2.2rem;
}
.empty-state h2 {
  font-size: clamp(1.45rem, 3vw, 2.1rem);
  margin: 0 0 0.65rem;
}
.empty-state > p:last-child {
  color: var(--muted);
  max-width: 35rem;
  margin: 0 auto;
}
</style>
