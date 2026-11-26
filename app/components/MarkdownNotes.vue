<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import "katex/dist/katex.min.css";
import { renderMarkdown } from "../utils/render-markdown";

const props = defineProps<{ source: string }>();
const html = computed(() => renderMarkdown(props.source));
const root = ref<HTMLElement>();
let observer: ResizeObserver | undefined;

const scrollSelectors = [
  [".notes-table-scroll", "Lesson notes table"],
  [".katex-display", "Lesson notes equation"],
  ["pre", "Lesson notes code block"],
] as const;

function updateScrollTargets() {
  for (const [selector, label] of scrollSelectors) {
    const targets = root.value?.querySelectorAll<HTMLElement>(selector) ?? [];
    Array.from(targets).forEach((target, index) => {
      // Hidden tab panels have zero width. Fitting content needs no extra tab stop.
      const overflowing = target.clientWidth > 0 && target.scrollWidth > target.clientWidth + 1;
      target.tabIndex = overflowing ? 0 : -1;
      if (selector !== ".notes-table-scroll") {
        if (overflowing) {
          target.setAttribute("role", "region");
          target.setAttribute("aria-label", label + " " + (index + 1));
        } else {
          target.removeAttribute("role");
          target.removeAttribute("aria-label");
        }
      }
    });
  }
}
function observeScrollTargets() {
  if (!observer || !root.value) return;
  observer.disconnect();
  observer.observe(root.value);
  for (const [selector] of scrollSelectors) {
    for (const target of root.value.querySelectorAll<HTMLElement>(selector)) {
      observer.observe(target);
      const content = target.firstElementChild;
      if (content) observer.observe(content);
    }
  }
  updateScrollTargets();
}
onMounted(() => {
  observer = new ResizeObserver(updateScrollTargets);
  observeScrollTargets();
});
watch(html, observeScrollTargets, { flush: "post" });
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="root" class="markdown-notes" v-html="html" />
</template>

<style scoped>
.markdown-notes {
  line-height: 1.8;
  overflow-wrap: anywhere;
  min-width: 0;
}
.markdown-notes :deep(h1),
.markdown-notes :deep(h2),
.markdown-notes :deep(h3),
.markdown-notes :deep(h4) {
  line-height: 1.3;
  margin-block: 1.8em 0.65em;
}
.markdown-notes :deep(h1:first-child),
.markdown-notes :deep(h2:first-child),
.markdown-notes :deep(h3:first-child) {
  margin-top: 0;
}
.markdown-notes :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.6rem;
}
.markdown-notes :deep(a) {
  color: #164b96;
  text-decoration: underline;
}
.markdown-notes :deep(pre) {
  overflow-x: auto;
  padding: 1rem;
  background: #eef2f7;
  border-radius: 0.6rem;
}
.markdown-notes :deep(code) {
  font-size: 0.9em;
  background: #eef2f7;
  border-radius: 0.2rem;
  padding: 0.1em 0.25em;
}
.markdown-notes :deep(pre code) {
  padding: 0;
}
.markdown-notes :deep(.notes-table-scroll) {
  max-width: 100%;
  overflow-x: auto;
  margin-block: 1rem;
}
.markdown-notes :deep(.notes-table-scroll:focus-visible),
.markdown-notes :deep(.katex-display:focus-visible),
.markdown-notes :deep(pre:focus-visible) {
  outline: 2px solid #164b96;
  outline-offset: -2px;
}
.markdown-notes :deep(table) {
  width: 100%;
  border-collapse: collapse;
}
.markdown-notes :deep(th),
.markdown-notes :deep(td) {
  border: 1px solid #cad5e4;
  min-width: 5rem;
  padding: 0.5rem 0.8rem;
  text-align: left;
}
.markdown-notes :deep(th) {
  background: #eef2f7;
}
.markdown-notes :deep(blockquote) {
  border-left: 3px solid #94a3b8;
  margin-inline: 0;
  padding-inline: 1rem;
  color: #475569;
}
.markdown-notes :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 0.5rem;
  max-width: 100%;
}
.markdown-notes :deep(.katex-display > .katex) {
  /* Keep the beginning of wide centered equations inside the scrollable area. */
  width: max-content;
  min-width: 100%;
}
.markdown-notes :deep(pre > code) {
  display: inline-block;
  min-width: max-content;
}
.markdown-notes :deep(.katex) {
  font-size: 1.1em;
}
</style>
