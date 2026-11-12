<script setup lang="ts">
definePageMeta({ middleware: ["auth0-sync"] });
const user = useUser();
useHead({
  link: [{ rel: "canonical", href: "https://www.skyinnk.in" }],
  title: "Skyinnk | Free Learning for School Students",
  meta: [
    {
      name: "description",
      content:
        "Explore free school learning with clear lessons, readable notes and resources on Skyinnk.",
    },
    {
      property: "og:title",
      content: "Skyinnk | Free Learning for School Students",
    },
    {
      property: "og:description",
      content:
        "Clear lessons, readable notes and resources. Public learning requires no registration.",
    },
    { property: "og:url", content: "https://www.skyinnk.in/" },
  ],
  htmlAttrs: { lang: "en" },
});
</script>

<template>
  <main id="main-content" class="home">
    <header class="topline">
      <strong class="brand">Skyinnk</strong>
      <nav aria-label="Main navigation">
        <NuxtLink to="/courses">Explore courses</NuxtLink
        ><template v-if="user"
          ><span class="profile"
            ><img
              v-if="user.picture"
              :src="user.picture"
              :alt="user.name || 'User profile'"
              width="40"
              height="40"
              referrerpolicy="no-referrer"
            /><span v-if="user.name">{{ user.name }}</span
            ><span v-if="user.email">{{ user.email }}</span></span
          ><a href="/auth/logout">Log out</a></template
        ><a v-else href="/auth/login">Log in / Sign up</a>
      </nav>
    </header>
    <section class="hero">
      <p class="eyebrow">Learning that starts with understanding</p>
      <h1>Free lessons for curious school learners.</h1>
      <p>
        Explore clear explanations, useful notes and learning resources. Public
        lessons are open to everyone, with no registration required.
      </p>
      <NuxtLink class="cta" to="/courses">Explore free lessons</NuxtLink>
    </section>
    <section class="areas" aria-labelledby="areas-heading">
      <h2 id="areas-heading">What we're preparing</h2>
      <div class="tiles">
        <article>
          <h3>Class 10 Mathematics</h3>
          <p>Concepts explained step by step.</p>
        </article>
        <article>
          <h3>Class 10 English</h3>
          <p>Reading, grammar and practical writing.</p>
        </article>
        <article>
          <h3>Class 11 Commerce</h3>
          <p>Sample lessons will appear when reviewed and ready.</p>
        </article>
      </div>
      <p class="notice">
        Courses will appear in the catalogue only after their learning material
        is reviewed and released.
      </p>
    </section>
  </main>
</template>

<style scoped>
.home {
  font: inherit;
  color: #17233a;
  flex: 1;
}
.topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 1100px;
  margin: auto;
  padding: 1.25rem 1.5rem;
}
.brand {
  font-size: 1.35rem;
}
.profile {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
}
.profile img {
  border-radius: 50%;
  object-fit: cover;
}
.topline nav {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
}
.hero {
  padding: clamp(3rem, 8vw, 7rem) 1.5rem;
  text-align: center;
  background: #f1f6ff;
}
.hero h1 {
  font-size: clamp(2.1rem, 5vw, 4.1rem);
  line-height: 1.12;
  max-width: 850px;
  margin: 0 auto;
}
.hero > p:not(.eyebrow) {
  max-width: 650px;
  margin: 1.5rem auto 2rem;
  font-size: 1.15rem;
  line-height: 1.7;
  color: #465775;
}
.eyebrow {
  color: #1b57a6;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.8rem;
}
.cta {
  display: inline-block;
  background: #164b96;
  color: white;
  padding: 0.85rem 1.3rem;
  border-radius: 0.65rem;
  text-decoration: none;
  font-weight: 700;
}
.areas {
  max-width: 1100px;
  margin: 3rem auto;
  padding: 0 1.5rem;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
}
.tiles article {
  border: 1px solid #d7e1ef;
  border-radius: 0.85rem;
  padding: 1.1rem;
  background: white;
}
.tiles h3 {
  margin: 0.1rem 0;
}
.tiles p,
.notice {
  color: #51617a;
  line-height: 1.6;
}
.notice {
  margin-top: 1.5rem;
}
a:focus-visible {
  outline: 3px solid #2676ce;
  outline-offset: 3px;
}
@media (max-width: 540px) {
  .topline {
    align-items: flex-start;
    flex-direction: column;
  }
  .hero {
    text-align: left;
  }
  .hero h1,
  .hero > p:not(.eyebrow) {
    margin-left: 0;
  }
}
</style>
