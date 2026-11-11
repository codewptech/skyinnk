<script setup lang="ts">
import type { PublicModule } from "../../utils/public-catalogue";

const props = defineProps<{
  courseSlug: string;
  modules: PublicModule[];
  lessonKey: string;
}>();
const emit = defineEmits<{ navigate: [] }>();
const orderedModules = computed(() =>
  [...props.modules].sort((a, b) => a.position - b.position),
);
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
.syllabus-module + .syllabus-module {
  margin-top: 1.6rem;
}
h3 {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #536275;
  line-height: 1.5;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.3rem;
}
a {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.8rem;
  border-radius: 0.65rem;
  text-decoration: none;
  font-size: 0.94rem;
  line-height: 1.5;
  color: #34435a;
  overflow-wrap: anywhere;
}
a:hover {
  background: #edf3f9;
}
a[aria-current="page"] {
  background: #e8f3ed;
  color: #17543d;
  font-weight: 650;
  box-shadow: inset 3px 0 #27815b;
}
.lesson-kind {
  flex: 0 0 1.15rem;
  font-size: 1rem;
}
</style>
