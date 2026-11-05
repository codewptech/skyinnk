<script setup lang="ts">
useHead({ htmlAttrs: { lang: "en" } });
</script>

<template>
  <div class="site-shell">
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
