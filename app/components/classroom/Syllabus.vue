<script setup lang="ts">
import type { PublicModule } from "../../utils/public-catalogue";
import { syllabusAccessibleNames } from "../../utils/syllabus-link-labels";

const props = defineProps<{
  courseSlug: string;
  modules: PublicModule[];
  lessonKey: string;
}>();
const emit = defineEmits<{ navigate: [] }>();
const orderedModules = computed(() =>
  [...props.modules].sort((a, b) => a.position - b.position),
);
const linkLabels = computed(() => syllabusAccessibleNames(props.modules));
</script>

<template>
  <nav aria-label="Course lessons" class="syllabus-list">
    <section
      v-for="module in orderedModules"
      :key="module.key"
      class="syllabus-module"
    >
      <h3>{{ module.title }}</h3>
      <ol>
        <li
          v-for="item in [...module.lessons].sort(
            (a, b) => a.position - b.position,
          )"
          :key="item.key"
        >
          <NuxtLink
            :to="`/courses/${courseSlug}/lessons/${item.slug}`"
            :aria-label="linkLabels.get(item.key)"
            :aria-current="item.key === lessonKey ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <span class="lesson-kind" aria-hidden="true">{{
              item.kind === "video" ? "▷" : "≡"
            }}</span>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </li>
      </ol>
    </section>
  </nav>
</template>

<style scoped>
.syllabus-module + .syllabus-module { margin-top: 1.45rem; }
h3 { margin: 0 0 .65rem; padding: 0 .55rem; font-size: .78rem; font-weight: 750; letter-spacing: .04em; color: var(--muted); line-height: 1.5; }
ol { list-style: none; padding: 0; margin: 0; display: grid; gap: .35rem; }
a { display: flex; align-items: flex-start; gap: .7rem; padding: .7rem; min-height: 44px; border-radius: .7rem; border: 1px solid transparent; text-decoration: none; font-size: .94rem; line-height: 1.5; color: var(--ink); overflow-wrap: anywhere; }
a:hover { background: #f4f3fc; }
a[aria-current="page"] { background: var(--soft); border-color: #c8c2ed; color: var(--brand); font-weight: 700; box-shadow: inset 3px 0 var(--brand); }
.lesson-kind { flex: 0 0 1.7rem; height: 1.7rem; display: grid; place-items: center; background: #f2f2f8; color: var(--brand); border-radius: .45rem; font-size: 1rem; line-height: 1; }
a[aria-current="page"] .lesson-kind { background: var(--brand); color: white; }
</style>
