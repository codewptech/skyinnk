<script setup lang="ts">
import type { NuxtError } from "#app";
const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
useHead(() => ({ title: notFound.value ? "Page unavailable | Skyinnk" : "Something went wrong | Skyinnk", htmlAttrs: { lang: "en" }, meta: [{ name: "robots", content: "noindex" }] }));
function returnToCourses() { return clearError({ redirect: "/courses" }); }
</script>
<template>
  <main class="error-page" id="main-content">
    <div class="error-card">
      <div class="error-brand"><span aria-hidden="true">S</span>Skyinnk</div>
      <p class="error-kicker">{{ notFound ? "Page unavailable" : "Something went wrong" }}</p>
      <h1>{{ notFound ? "This page isn't available." : "Let's get back to learning." }}</h1>
      <p>{{ notFound ? "The lesson or page may not be published, or the address may be incorrect." : "We couldn't load this page. You can return to the course catalogue and try again." }}</p>
      <button type="button" @click="returnToCourses">Explore courses <span aria-hidden="true">→</span></button>
    </div>
  </main>
</template>
<style scoped>
.error-page { min-height: 100vh; min-height: 100svh; display: grid; place-items: center; box-sizing: border-box; padding: 1rem; background: #f7f7f2; color: #20243a; font-family: "Aptos","Inter","Segoe UI",system-ui,sans-serif; line-height: 1.65; }
.error-card { box-sizing: border-box; width: min(100%, 34rem); padding: clamp(1.4rem,5vw,3rem); background: white; border: 1px solid #dcdfe8; border-radius: 1.2rem; }
.error-brand { display: flex; align-items: center; gap: .65rem; font-size: 1.45rem; font-weight: 750; letter-spacing: -.05em; margin-bottom: 2.1rem; }
.error-brand span { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; color: white; background: #4338a8; border-radius: .8rem .8rem .8rem .25rem; }
.error-kicker { text-transform: uppercase; font-size: .77rem; color: #4338a8; letter-spacing: .09em; font-weight: 750; }
h1 { font-size: clamp(2rem,6vw,3rem); line-height: 1.12; letter-spacing: -.05em; margin: .5rem 0 1rem; }
p { color: #515a70; overflow-wrap: anywhere; }
button { font: inherit; color: white; background: #4338a8; border: 0; border-radius: .75rem; padding: .8rem 1.2rem; min-height: 48px; font-weight: 700; cursor: pointer; }
button:focus-visible { outline: 3px solid #4b39b5; outline-offset: 4px; }
</style>
