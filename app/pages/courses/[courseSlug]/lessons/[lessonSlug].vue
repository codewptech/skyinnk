<script setup lang="ts">
import {
  findPublicLesson,
  orderedPublicLessons,
} from "../../../../utils/public-catalogue";
import ClassroomSyllabus from "../../../../components/classroom/Syllabus.vue";

// Keep the classroom shell mounted between lesson routes, including browser history.
definePageMeta({ key: "public-classroom" });
const route = useRoute();
const match = computed(() =>
  findPublicLesson(
    String(route.params.courseSlug ?? ""),
    String(route.params.lessonSlug ?? ""),
  ),
);
if (!match.value)
  throw createError({ statusCode: 404, statusMessage: "Lesson not published" });
const course = computed(() => match.value!.course);
const lesson = computed(() => match.value!.lesson);
const ordered = computed(() => orderedPublicLessons(course.value));
const index = computed(() =>
  ordered.value.findIndex((item) => item.key === lesson.value.key),
);
const previous = computed(() => ordered.value[index.value - 1]);
const next = computed(() => ordered.value[index.value + 1]);
const activeTab = ref("overview");
const availableTabs = computed(() => [
  { key: "overview", label: "Overview" },
  ...(lesson.value.notesMarkdown ? [{ key: "notes", label: "Notes" }] : []),
  ...(lesson.value.resources?.length
    ? [{ key: "resources", label: "Resources" }]
    : []),
]);
const sidebarExpanded = ref(true);
const videoLoaded = ref(false);
const drawer = ref<HTMLDialogElement>();
const drawerToggle = ref<HTMLButtonElement>();
const drawerOpen = ref(false);

function openDrawer() {
  drawer.value?.showModal();
  drawerOpen.value = true;
}
function closeDrawer() {
  if (!drawer.value?.open) return;
  drawer.value.close();
  drawerOpen.value = false;
  drawerToggle.value?.focus();
}
function drawerClosed() {
  drawerOpen.value = false;
  drawerToggle.value?.focus();
}
function onDrawerBackdrop(event: MouseEvent) {
  if (event.target !== drawer.value) return;
  const bounds = drawer.value.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    closeDrawer();
}
async function onTabKey(event: KeyboardEvent, key: string) {
  const items = availableTabs.value;
  const current = items.findIndex((item) => item.key === key);
  let target: number;
  if (event.key === "ArrowRight") target = (current + 1) % items.length;
  else if (event.key === "ArrowLeft")
    target = (current + items.length - 1) % items.length;
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = items.length - 1;
  else return;
  event.preventDefault();
  activeTab.value = items[target]!.key;
  await nextTick();
  document.getElementById(`lesson-tab-${activeTab.value}`)?.focus();
}

// Invalid lesson paths remain unavailable during client-side navigation as well.
onBeforeRouteUpdate((to) => {
  if (
    !findPublicLesson(
      String(to.params.courseSlug ?? ""),
      String(to.params.lessonSlug ?? ""),
    )
  ) {
    showError(
      createError({ statusCode: 404, statusMessage: "Lesson not published" }),
    );
    return false;
  }
});
watch(
  () => lesson.value.key,
  () => {
    activeTab.value = "overview";
    videoLoaded.value = false;
    closeDrawer();
  },
);
onBeforeUnmount(closeDrawer);
useHead(() => ({
  title: `${lesson.value.title} | ${course.value.title} | Skyinnk`,
  link: [
    {
      rel: "canonical",
      href: `https://www.skyinnk.in/courses/${course.value.slug}/lessons/${lesson.value.slug}`,
    },
  ],
  meta: [
    { name: "description", content: lesson.value.overview },
    { property: "og:title", content: `${lesson.value.title} | Skyinnk` },
    { property: "og:description", content: lesson.value.overview },
    { property: "og:type", content: "article" },
    {
      property: "og:url",
      content: `https://www.skyinnk.in/courses/${course.value.slug}/lessons/${lesson.value.slug}`,
    },
  ],
}));
</script>

<template>
  <main id="main-content" class="classroom-page">
    <nav class="classroom-breadcrumbs" aria-label="Breadcrumb">
      <NuxtLink to="/courses">Courses</NuxtLink
      ><span aria-hidden="true">/</span>
      <NuxtLink :to="`/courses/${course.slug}`">{{ course.title }}</NuxtLink>
    </nav>
    <div class="classroom-toolbar">
      <button
        class="syllabus-toggle desktop-toggle"
        type="button"
        :aria-expanded="sidebarExpanded"
        aria-controls="desktop-syllabus"
        @click="sidebarExpanded = !sidebarExpanded"
      >
        <span aria-hidden="true">☰</span>
        {{ sidebarExpanded ? "Hide syllabus" : "Show syllabus" }}
      </button>
      <button
        ref="drawerToggle"
        class="syllabus-toggle mobile-toggle"
        type="button"
        :aria-expanded="drawerOpen"
        aria-controls="mobile-syllabus"
        aria-haspopup="dialog"
        @click="openDrawer"
      >
        <span aria-hidden="true">☰</span> Course syllabus
      </button>
      <span class="lesson-number"
        >Lesson {{ index + 1 }} of {{ ordered.length }}</span
      >
    </div>
    <div
      class="classroom-workspace"
      :class="{ 'sidebar-collapsed': !sidebarExpanded }"
    >
      <aside
        v-show="sidebarExpanded"
        id="desktop-syllabus"
        class="desktop-syllabus"
        aria-label="Course syllabus"
      >
        <div class="syllabus-heading">
          <span class="eyebrow">YOUR LEARNING PATH</span>
          <h2>{{ course.title }}</h2>
          <p>
            {{ ordered.length }} public
            {{ ordered.length === 1 ? "lesson" : "lessons" }}
          </p>
        </div>
        <ClassroomSyllabus
          :course-slug="course.slug"
          :modules="course.modules"
          :lesson-key="lesson.key"
        />
      </aside>
      <article class="lesson-workspace" aria-labelledby="lesson-title">
        <div v-if="lesson.video?.provider === 'youtube'" class="video-player">
          <iframe
            v-if="videoLoaded"
            :key="lesson.key"
            :src="`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.video.publicId)}`"
            :title="lesson.title"
            allow="fullscreen; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          />
          <div v-else class="video-placeholder">
            <span class="play-symbol" aria-hidden="true">▷</span>
            <button
              type="button"
              class="load-video"
              @click="videoLoaded = true"
            >
              Load lesson video
            </button>
            <p>
              Loads a video from YouTube. Playback starts when you press play.
            </p>
            <a
              :href="`https://www.youtube.com/watch?v=${encodeURIComponent(lesson.video.publicId)}`"
              target="_blank"
              rel="noopener noreferrer"
              >Watch on YouTube
              <span class="sr-only">(opens in a new tab)</span></a
            >
          </div>
        </div>
        <div class="lesson-heading">
          <span class="eyebrow">{{ course.subject }} · PUBLIC LESSON</span>
          <h1 id="lesson-title">{{ lesson.title }}</h1>
          <p>Free to learn. No account required.</p>
        </div>
        <div class="lesson-tabs" role="tablist" aria-label="Lesson content">
          <button
            v-for="item in availableTabs"
            :id="`lesson-tab-${item.key}`"
            :key="item.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === item.key"
            :aria-controls="`lesson-panel-${item.key}`"
            :tabindex="activeTab === item.key ? 0 : -1"
            @click="activeTab = item.key"
            @keydown="onTabKey($event, item.key)"
          >
            {{ item.label }}
          </button>
        </div>
        <section
          :id="`lesson-panel-${activeTab}`"
          class="lesson-panel"
          role="tabpanel"
          :aria-labelledby="`lesson-tab-${activeTab}`"
          tabindex="0"
        >
          <template v-if="activeTab === 'overview'"
            ><h2>About this lesson</h2>
            <p class="overview-copy">{{ lesson.overview }}</p></template
          >
          <template v-else-if="activeTab === 'notes'"
            ><h2 class="sr-only">Lesson notes</h2>
            <MarkdownNotes :source="lesson.notesMarkdown"
          /></template>
          <template v-else-if="activeTab === 'resources'"
            ><h2>Lesson resources</h2>
            <p>These resources are available to everyone.</p>
            <ul class="resource-list">
              <li v-for="resource in lesson.resources" :key="resource.key">
                <div>
                  <strong>{{ resource.title }}</strong
                  ><span
                    >{{ resource.type }} ·
                    {{
                      resource.sizeBytes < 1024
                        ? `${resource.sizeBytes} bytes`
                        : `${Math.ceil(resource.sizeBytes / 1024)} KB`
                    }}</span
                  >
                </div>
                <div class="resource-actions">
                  <a
                    :href="resource.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Preview<span class="sr-only">
                      {{ resource.title }} (opens in a new tab)</span
                    ></a
                  ><a :href="resource.url" download
                    >Download<span class="sr-only">
                      {{ resource.title }}</span
                    ></a
                  >
                </div>
              </li>
            </ul></template
          >
        </section>
        <nav class="lesson-navigation" aria-label="Lesson navigation">
          <NuxtLink
            v-if="previous"
            class="previous-lesson"
            :to="`/courses/${course.slug}/lessons/${previous.slug}`"
            ><span>← Previous lesson</span
            ><strong>{{ previous.title }}</strong></NuxtLink
          >
          <NuxtLink
            v-if="next"
            class="next-lesson"
            :to="`/courses/${course.slug}/lessons/${next.slug}`"
            ><span>Next lesson →</span
            ><strong>{{ next.title }}</strong></NuxtLink
          >
          <NuxtLink v-else class="next-lesson" :to="`/courses/${course.slug}`"
            ><span>Back to course →</span
            ><strong>Explore the syllabus</strong></NuxtLink
          >
        </nav>
      </article>
    </div>
    <dialog
      id="mobile-syllabus"
      ref="drawer"
      class="syllabus-drawer"
      aria-labelledby="drawer-title"
      @close="drawerClosed"
      @click="onDrawerBackdrop"
    >
      <div class="drawer-header">
        <h2 id="drawer-title">Course syllabus</h2>
        <button
          type="button"
          class="drawer-close"
          autofocus
          aria-label="Close course syllabus"
          @click="closeDrawer"
        >
          ×
        </button>
      </div>
      <p class="drawer-course">{{ course.title }}</p>
      <ClassroomSyllabus
        :course-slug="course.slug"
        :modules="course.modules"
        :lesson-key="lesson.key"
        @navigate="closeDrawer"
      />
    </dialog>
  </main>
</template>

<style scoped>
.classroom-page {
  width: min(100% - 3rem, 1320px);
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}
.classroom-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #526475;
  margin-bottom: 1.3rem;
}
.classroom-breadcrumbs a {
  text-decoration: none;
}
.classroom-breadcrumbs a:hover {
  text-decoration: underline;
}
.classroom-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
}
button {
  font: inherit;
  cursor: pointer;
}
.syllabus-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
  padding: 0.55rem 0.85rem;
  border: 1px solid #d6e0e7;
  background: white;
  border-radius: 0.6rem;
  font-size: 0.9rem;
  color: #233d38;
}
.mobile-toggle {
  display: none;
}
.lesson-number {
  font-size: 0.85rem;
  color: #60716f;
}
.classroom-workspace {
  display: grid;
  grid-template-columns: 275px minmax(0, 1fr);
  align-items: start;
  gap: 1.5rem;
}
.classroom-workspace.sidebar-collapsed {
  grid-template-columns: minmax(0, 1fr);
}
.desktop-syllabus {
  position: sticky;
  top: 1rem;
  max-height: calc(100svh - 2rem);
  overflow-y: auto;
  border: 1px solid #e0e7e7;
  background: white;
  border-radius: 1rem;
  padding: 1.3rem 0.85rem;
}
.syllabus-heading {
  padding: 0 0.5rem 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #edf0f0;
}
.eyebrow {
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  color: #39715d;
}
.syllabus-heading h2 {
  font-size: 1.1rem;
  line-height: 1.5;
  margin: 0.5rem 0;
}
.syllabus-heading p {
  font-size: 0.8rem;
  color: #60716f;
  margin: 0;
}
.lesson-workspace {
  min-width: 0;
  overflow: hidden;
  background: white;
  border: 1px solid #e0e7e7;
  border-radius: 1rem;
}
.video-player {
  aspect-ratio: 16 / 9;
  background: #112a26;
}
.video-player iframe {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
}
.video-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  justify-content: center;
  align-items: center;
  padding: 1.3rem;
  box-sizing: border-box;
  color: #f0f8f3;
  text-align: center;
}
.play-symbol {
  font-size: 3rem;
  line-height: 1;
  color: #b3d8b5;
}
.load-video {
  background: #eff7ed;
  color: #173d2d;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 650;
  min-height: 44px;
}
.video-placeholder p {
  max-width: 26rem;
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #d0dfd7;
}
.video-placeholder a {
  font-size: 0.8rem;
  color: #e1efdf;
}
.lesson-heading {
  padding: 1.8rem 2rem 1.4rem;
}
h1 {
  margin: 0.5rem 0 0.7rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: -0.035em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.lesson-heading p {
  font-size: 0.85rem;
  color: #60716f;
  margin: 0;
}
.lesson-tabs {
  display: flex;
  border-bottom: 1px solid #e0e7e7;
  padding: 0 2rem;
  gap: 1.5rem;
  overflow-x: auto;
}
.lesson-tabs button {
  flex: 0 0 auto;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  padding: 0.95rem 0.1rem;
  color: #62716c;
  font-weight: 600;
  min-height: 48px;
}
.lesson-tabs button[aria-selected="true"] {
  border-bottom-color: #287151;
  color: #17492f;
}
.lesson-panel {
  padding: 1.5rem 2rem 2rem;
  min-height: 10rem;
}
.lesson-panel h2 {
  margin: 0 0 1rem;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}
.overview-copy {
  line-height: 1.85;
  color: #40584f;
  white-space: pre-line;
  margin: 0;
}
.lesson-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid #e0e7e7;
  padding: 1.3rem 2rem;
}
.lesson-navigation a {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-decoration: none;
  max-width: 48%;
  overflow-wrap: anywhere;
}
.lesson-navigation a:hover strong {
  text-decoration: underline;
}
.lesson-navigation span {
  color: #60716f;
  font-size: 0.8rem;
}
.lesson-navigation strong {
  color: #20563b;
  font-size: 0.9rem;
  line-height: 1.5;
}
.next-lesson {
  margin-left: auto;
  text-align: right;
}
.resource-list {
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.8rem;
}
.resource-list li {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #dce6df;
  border-radius: 0.65rem;
}
.resource-list strong {
  display: block;
  font-size: 0.9rem;
}
.resource-list span {
  display: block;
  margin-top: 0.3rem;
  color: #63766c;
  font-size: 0.75rem;
}
.resource-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  font-size: 0.85rem;
  color: #20563b;
}
.syllabus-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  margin: 0;
  height: 100svh;
  max-height: 100svh;
  width: min(88vw, 360px);
  max-width: none;
  border: 0;
  padding: 1.3rem 1rem;
  box-sizing: border-box;
  background: #fff;
  color: #233b2f;
}
.syllabus-drawer::backdrop {
  background: rgb(10 30 25 / 55%);
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.drawer-header h2 {
  font-size: 1.15rem;
  margin: 0;
}
.drawer-close {
  border: 1px solid #d7e2da;
  background: white;
  border-radius: 0.5rem;
  min-width: 44px;
  min-height: 44px;
  font-size: 1.5rem;
}
.drawer-course {
  color: #60716f;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
button:focus-visible,
a:focus-visible,
.lesson-panel:focus-visible {
  outline: 3px solid #327c5b;
  outline-offset: 3px;
}
@media (min-width: 701px) and (max-width: 1000px) {
  .classroom-workspace {
    grid-template-columns: 225px minmax(0, 1fr);
    gap: 1rem;
  }
  .classroom-workspace.sidebar-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }
  .lesson-heading,
  .lesson-panel {
    padding-left: 1.3rem;
    padding-right: 1.3rem;
  }
  .lesson-tabs,
  .lesson-navigation {
    padding-left: 1.3rem;
    padding-right: 1.3rem;
  }
}
@media (max-width: 700px) {
  .classroom-page {
    width: min(100% - 1.5rem, 1320px);
    padding-top: 1rem;
  }
  .desktop-toggle,
  .desktop-syllabus {
    display: none !important;
  }
  .mobile-toggle {
    display: inline-flex;
  }
  .classroom-workspace,
  .classroom-workspace.sidebar-collapsed {
    display: block;
  }
  .lesson-heading {
    padding: 1.4rem 1.15rem 1.2rem;
  }
  .lesson-panel {
    padding: 1.3rem 1.15rem 1.5rem;
  }
  .lesson-tabs {
    padding: 0 1.15rem;
    gap: 1.3rem;
  }
  .lesson-navigation {
    padding: 1.1rem 1.15rem;
  }
  .play-symbol {
    font-size: 2rem;
  }
  .video-placeholder {
    gap: 0.45rem;
    padding: 0.75rem;
  }
  .video-placeholder p {
    font-size: 0.7rem;
  }
  .video-placeholder a {
    font-size: 0.7rem;
  }
  .load-video {
    padding: 0.55rem 0.8rem;
    font-size: 0.85rem;
  }
  .resource-list li {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
