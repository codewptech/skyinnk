<script setup lang="ts">
useHead({
  htmlAttrs: { lang: "en" },
  meta: [
    { property: "og:site_name", content: "Skyinnk" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <footer class="site-footer">
      <nav aria-label="Legal">
        <NuxtLink to="/privacy-policy">Privacy Policy</NuxtLink>
        <NuxtLink to="/terms-of-service">Terms of Service</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}
button {
  font: inherit;
}
.skip-link {
  position: fixed;
  top: -6rem;
  left: 1rem;
  z-index: 100;
  padding: 0.8rem;
  background: #fff;
  border: 2px solid #164b96;
}
.skip-link:focus {
  top: 1rem;
}
body {
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.site-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
}

.site-shell > main {
  flex: 1;
}

a {
  color: inherit;
  text-underline-offset: 0.2em;
}

a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

.site-footer {
  padding: 1.25rem 2rem;
  color: #475569;
  font-size: 0.9375rem;
}

.site-footer nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.5rem;
}
</style>
