<script setup lang="ts">
import { listPublicCourses } from "../../utils/public-catalogue";
const courses = listPublicCourses();
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
    <NuxtLink to="/">Skyinnk / Home</NuxtLink>
    <h1>Explore courses</h1>
    <p>Published learning material is available without registration.</p>
    <div v-if="courses.length" class="grid">
      <article v-for="course in courses" :key="course.key">
        <h2>{{ course.title }}</h2>
        <p>{{ course.summary }}</p>
        <NuxtLink :to="`/courses/${course.slug}`">View syllabus</NuxtLink>
      </article>
    </div>
    <section v-else aria-label="No published courses">
      <h2>Lessons are being prepared</h2>
      <p>
        We will list courses here as soon as substantive, educator-reviewed
        lessons are published. There are no published courses to browse yet.
      </p>
    </section>
  </main>
</template>
<style scoped>
.catalogue {
  box-sizing: border-box;
  width: min(100%, 1050px);
  margin: auto;
  padding: 2rem 1.5rem;
  flex: 1;
}
.catalogue > p {
  color: #465775;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}
.grid article,
.catalogue section {
  border: 1px solid #d6dfeb;
  border-radius: 1rem;
  padding: 1.5rem;
  background: white;
  margin-top: 1.5rem;
}
h1 {
  font-size: clamp(2rem, 5vw, 3rem);
}
a {
  color: #164b96;
}
</style>
