<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <main class="legal-page">
    <NuxtLink to="/">Skyinnk home</NuxtLink>
    <article aria-labelledby="legal-title">
      <h1 id="legal-title">{{ title }}</h1>
      <slot />
    </article>
  </main>
</template>

<style scoped>
.legal-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 50rem;
  margin: 0 auto;
  padding: 2rem clamp(1.25rem, 5vw, 3rem) 3rem;
  overflow-wrap: anywhere;
  line-height: 1.7;
}

h1 {
  margin: 2rem 0 1rem;
  font-size: clamp(2rem, 7vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.legal-page :deep(h2) {
  margin: 2rem 0 0.75rem;
  font-size: 1.25rem;
  line-height: 1.4;
}

.legal-page :deep(p),
.legal-page :deep(ul) {
  margin: 0.75rem 0;
  color: #475569;
}

.legal-page :deep(ul) {
  padding-left: 1.5rem;
}
</style>
