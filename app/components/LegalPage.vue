<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <main id="main-content" class="legal-page">
    <header class="learning-nav"><NuxtLink class="learning-brand" to="/"><span class="brand-mark" aria-hidden="true">S</span>Skyinnk</NuxtLink><NuxtLink to="/">Skyinnk home</NuxtLink></header>
    <article aria-labelledby="legal-title">
      <p class="section-kicker">About Skyinnk · Policies</p>
      <h1 id="legal-title">{{ title }}</h1>
      <slot />
    </article>
  </main>
</template>

<style scoped>
.legal-page { width: min(100%, 58rem); margin: 0 auto; padding: 1.25rem var(--gutter) 4rem; overflow-wrap: anywhere; line-height: 1.8; }
.legal-page article { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(1.25rem,5vw,3rem); box-shadow: var(--shadow); }
h1 { margin: .5rem 0 1.4rem; font-size: clamp(2rem,7vw,3.4rem); font-weight: 750; letter-spacing: -.055em; line-height: 1.1; padding-bottom: 1.4rem; border-bottom: 1px solid var(--line); }
.legal-page :deep(h2) { margin: 2rem 0 .75rem; font-size: 1.3rem; line-height: 1.4; }
.legal-page :deep(p), .legal-page :deep(ul) { margin: .75rem 0; color: var(--muted); }
.legal-page :deep(ul) { padding-left: 1.5rem; }
.legal-page :deep(a) { color: var(--brand); }
</style>
