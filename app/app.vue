<script setup lang="ts">
useHead({
  title: "Coming Soon",
  meta: [
    {
      name: "description",
      content: "We're working on something new. Please check back soon.",
    },
  ],
  htmlAttrs: { lang: "en" },
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <main class="coming-soon">
    <h1>Coming Soon...</h1>
    <p>We're working on something new. Please check back soon.</p>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
}

.coming-soon {
  box-sizing: border-box;
  display: grid;
  min-height: 100vh;
  min-height: 100svh;
  place-content: center;
  padding: 2rem;
  background: #f8fafc;
  color: #0f172a;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

p {
  max-width: 34rem;
  margin: 1rem 0 0;
  color: #475569;
  font-size: 1.0625rem;
  line-height: 1.6;
}
</style>
