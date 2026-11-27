<script setup lang="ts">
import { focusMainContent } from "./utils/focus-main-content";
function onSkipToContent() {
  focusMainContent();
}
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
    <a class="skip-link" href="#main-content" @click="onSkipToContent">Skip to content</a>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-identity"><span class="brand-mark" aria-hidden="true">S</span><div><strong>Skyinnk</strong><p>Open learning for school students.</p></div></div>
        <nav aria-label="Legal">
        <NuxtLink to="/privacy-policy">Privacy Policy</NuxtLink>
        <NuxtLink to="/terms-of-service">Terms of Service</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --ink: #20243a;
  --muted: #515a70;
  --brand: #4338a8;
  --brand-hover: #322583;
  --paper: #f7f7f2;
  --surface: #ffffff;
  --line: #dcdfe8;
  --soft: #eeedfa;
  --mint: #e0f2e9;
  --amber: #f9eacb;
  --focus: #4b39b5;
  --radius: 1.15rem;
  --shadow: 0 8px 30px rgb(32 36 58 / 6%);
  --page-width: 1200px;
  --gutter: clamp(1rem, 4vw, 2.5rem);
  font-family: "Aptos", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 100%;
  font-synthesis: none;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); line-height: 1.6; }
button, input { font: inherit; }
a { color: inherit; text-underline-offset: .22em; }
a:focus-visible, button:focus-visible, [tabindex]:focus-visible {
  outline: 3px solid var(--focus); outline-offset: 4px;
}
h1, h2, h3, h4 { line-height: 1.2; letter-spacing: -.035em; overflow-wrap: anywhere; }
p { overflow-wrap: anywhere; }
.site-shell { display: flex; flex-direction: column; min-height: 100vh; min-height: 100svh; }
.site-shell > main { flex: 1; min-width: 0; }
.skip-link { position: fixed; top: -6rem; left: 1rem; z-index: 100; padding: .85rem 1rem; background: var(--surface); border: 2px solid var(--brand); color: var(--brand); border-radius: .5rem; }
.skip-link:focus { top: 1rem; }
.brand-mark { display: inline-grid; flex: 0 0 auto; place-items: center; width: 2.35rem; height: 2.35rem; background: var(--brand); color: white; border-radius: .8rem .8rem .8rem .25rem; font-size: 1.35rem; font-weight: 800; line-height: 1; }
.learning-brand { display: inline-flex; gap: .65rem; align-items: center; color: var(--ink); text-decoration: none; font-size: 1.4rem; font-weight: 780; letter-spacing: -.055em; min-height: 44px; }
.learning-nav { display: flex; align-items: center; justify-content: space-between; gap: .75rem 1.25rem; flex-wrap: wrap; padding: 0 0 1rem; margin-bottom: 1.2rem; border-bottom: 1px solid var(--line); }
.learning-nav > a:not(.learning-brand) { color: var(--brand); font-weight: 650; padding: .55rem 0; }
.section-kicker { color: var(--brand); font-size: .77rem; font-weight: 750; letter-spacing: .095em; text-transform: uppercase; margin: 0 0 .8rem; }
.action-primary { display: inline-flex; align-items: center; justify-content: center; gap: .65rem; background: var(--brand); color: #fff; border: 1px solid var(--brand); min-height: 48px; padding: .75rem 1.2rem; border-radius: .75rem; text-decoration: none; font-weight: 700; }
.action-primary:hover { background: var(--brand-hover); border-color: var(--brand-hover); }
.site-footer { border-top: 1px solid var(--line); background: var(--surface); color: var(--muted); padding: 1.7rem var(--gutter); font-size: .9rem; }
.footer-inner { max-width: var(--page-width); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.footer-identity { display: flex; align-items: center; gap: .7rem; }
.footer-identity strong { color: var(--ink); font-size: 1.05rem; letter-spacing: -.03em; }
.footer-identity p { margin: 0; }
.site-footer nav { display: flex; flex-wrap: wrap; gap: .7rem 1.4rem; }
@media (max-width: 440px) { .footer-inner { align-items: flex-start; flex-direction: column; } }
@media print { .site-footer { display: none; } body { background: white; } }
</style>
