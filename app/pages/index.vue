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
      <NuxtLink class="learning-brand" to="/"><span class="brand-mark" aria-hidden="true">S</span>Skyinnk</NuxtLink>
      <nav aria-label="Main navigation">
        <NuxtLink class="nav-library" to="/courses">Explore courses</NuxtLink>
        <template v-if="user">
          <span class="profile">
            <img v-if="user.picture" :src="user.picture" :alt="user.name || 'User profile'" width="40" height="40" referrerpolicy="no-referrer" />
            <span v-if="user.name">{{ user.name }}</span>
            <span v-if="user.email">{{ user.email }}</span>
          </span>
          <a class="account-link" href="/auth/logout">Log out</a>
        </template>
        <a v-else class="account-link" href="/auth/login">Log in / Sign up</a>
      </nav>
    </header>
    <section class="hero" aria-labelledby="hero-heading">
      <div class="hero-copy">
        <p class="section-kicker">School learning · Open to everyone</p>
        <h1 id="hero-heading">Understand more.<br />Learn at your pace.</h1>
        <p class="hero-intro">Explore clear explanations, useful notes and learning resources. Public lessons are free, with no registration required.</p>
        <NuxtLink class="action-primary" to="/courses">Explore free lessons <span aria-hidden="true">→</span></NuxtLink>
        <p class="hero-note"><span aria-hidden="true">✓</span> No account required for public lessons</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-grid"></div>
        <div class="art-label"><span></span> A space to understand</div>
        <div class="notebook">
          <div class="notebook-top"><span>THE LEARNING STUDIO</span><span>01 / ∞</span></div>
          <div class="notebook-heading">Make it<br />make sense.</div>
          <div class="notebook-rule"></div>
          <div class="notebook-bottom"><span>Explore</span><span>Understand</span><span>Revisit</span></div>
        </div>
        <div class="math-card"><span>x²</span><svg viewBox="0 0 100 64" fill="none" focusable="false" aria-hidden="true"><path d="M9 53H94M22 4V59" stroke="currentColor" stroke-width="1.4"/><path d="M26 12C38 67 60 67 88 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div>
        <div class="reading-card"><span>Aa</span><i></i><i></i><i></i></div>
        <div class="art-caption">One concept at a time.</div>
      </div>
    </section>
    <section class="areas" aria-labelledby="areas-heading">
      <div class="section-head">
        <div><p class="section-kicker">Learning library</p><h2 id="areas-heading">What we're preparing</h2></div>
        <p>Start with the subjects that matter to you. Reviewed courses will appear in the catalogue when ready.</p>
      </div>
      <div class="tiles">
        <article><div class="subject-icon maths" aria-hidden="true">∑</div><p class="subject-level">Class 10</p><h3>Mathematics</h3><p>Concepts explained step by step.</p><span class="preparing">In preparation</span></article>
        <article><div class="subject-icon english" aria-hidden="true">Aa</div><p class="subject-level">Class 10</p><h3>English</h3><p>Reading, grammar and practical writing.</p><span class="preparing">In preparation</span></article>
        <article><div class="subject-icon commerce" aria-hidden="true">▤</div><p class="subject-level">Class 11</p><h3>Commerce</h3><p>Sample lessons will appear when reviewed and ready.</p><span class="preparing">Preview planned</span></article>
      </div>
      <div class="notice"><div><strong>Thoughtfully prepared, openly available.</strong><p>Courses will appear in the catalogue only after their learning material is reviewed and released.</p></div><NuxtLink to="/courses">Visit the catalogue <span aria-hidden="true">→</span></NuxtLink></div>
    </section>
    <section class="learning-format" aria-labelledby="format-heading">
      <div><p class="section-kicker">Built for understanding</p><h2 id="format-heading">Learn in the way that works for you.</h2></div>
      <div class="format-grid">
        <article><span aria-hidden="true">01</span><h3>Watch</h3><p>Video explanations when available.</p></article>
        <article><span aria-hidden="true">02</span><h3>Read</h3><p>Clear, readable lesson notes.</p></article>
        <article><span aria-hidden="true">03</span><h3>Revisit</h3><p>Open lessons and available resources whenever you need them.</p></article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home { width: min(100%, var(--page-width) + 2 * var(--gutter)); margin: 0 auto; padding: 0 var(--gutter) 4rem; }
.topline { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: 1.25rem 0; }
.topline nav { display: flex; align-items: center; flex-wrap: wrap; gap: .65rem 1.25rem; min-width: 0; }
.nav-library { color: var(--brand); font-weight: 650; padding: .6rem 0; }
.account-link { display: inline-flex; align-items: center; min-height: 44px; padding: .55rem .9rem; border: 1px solid var(--line); border-radius: .65rem; background: white; text-decoration: none; font-weight: 650; }
.account-link:hover { border-color: var(--brand); color: var(--brand); }
.profile { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; min-width: 0; overflow-wrap: anywhere; font-size: .85rem; color: var(--muted); }
.profile img { border-radius: 50%; object-fit: cover; }
.hero { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,.95fr); align-items: center; gap: clamp(1.5rem,5vw,4rem); padding: clamp(2.3rem,6vw,4.7rem) 0; }
.hero-copy { min-width: 0; }
.hero h1 { font-size: clamp(2.65rem,5.5vw,5rem); font-weight: 760; line-height: 1.04; letter-spacing: -.065em; margin: .7rem 0 1.5rem; }
.hero-intro { max-width: 36rem; font-size: clamp(1.03rem,1.6vw,1.24rem); line-height: 1.75; color: var(--muted); margin: 0 0 1.8rem; }
.hero-note { color: var(--muted); font-size: .86rem; margin: .85rem 0 0; }
.hero-note span { color: #236044; font-weight: 800; margin-right: .25rem; }
.hero-art { position: relative; min-width: 0; min-height: 360px; height: clamp(360px,38vw,490px); overflow: hidden; isolation: isolate; background: #e3e1fa; border-radius: 2rem 2rem 2rem .5rem; color: #27245d; }
.art-grid { position: absolute; inset: 0; opacity: .36; background-image: linear-gradient(#b6b1e1 1px, transparent 1px),linear-gradient(90deg,#b6b1e1 1px,transparent 1px); background-size: 27px 27px; mask-image: linear-gradient(120deg,#000,transparent); }
.art-label { position: absolute; top: 7%; left: 6%; display: flex; gap: .5rem; align-items: center; font-size: .77rem; font-weight: 700; }
.art-label span { width: .65rem; height: .65rem; border-radius: 50%; background: #4338a8; }
.notebook { position: absolute; top: 19%; left: 16%; width: 65%; height: 64%; background: #fffef8; border: 1px solid #bcb9dc; border-radius: .8rem; transform: rotate(-6deg); box-shadow: 10px 12px 0 #bdb9ee; padding: 7% 6%; display: flex; flex-direction: column; justify-content: space-between; }
.notebook-top { display: flex; justify-content: space-between; gap: .4rem; font-size: clamp(.45rem,.85vw,.65rem); font-weight: 750; letter-spacing: .055em; }
.notebook-heading { font-size: clamp(1.6rem,3.5vw,3.25rem); line-height: 1.04; letter-spacing: -.07em; font-weight: 750; }
.notebook-rule { width: 70%; height: 2px; background: #4338a8; }
.notebook-bottom { display: flex; flex-wrap: wrap; gap: .3rem .55rem; font-size: clamp(.55rem,1vw,.72rem); font-weight: 650; }
.math-card,.reading-card { position: absolute; border-radius: .8rem; box-shadow: 5px 8px 0 rgb(32 36 58 / 12%); padding: .7rem; }
.math-card { width: 31%; top: 22%; right: 5%; background: var(--mint); color: #235b44; transform: rotate(9deg); }
.math-card span { font-size: clamp(1.15rem,2.8vw,2rem); font-weight: 750; }
.math-card svg { display: block; width: 100%; height: auto; }
.reading-card { width: 28%; bottom: 15%; left: 5%; background: var(--amber); color: #684417; transform: rotate(7deg); }
.reading-card span { font-size: clamp(1.4rem,3vw,2.5rem); font-weight: 700; font-family: Georgia, serif; display: block; line-height: 1.1; }
.reading-card i { display: block; width: 100%; height: 2px; margin-top: .4rem; background: currentColor; opacity: .6; }
.reading-card i:last-child { width: 64%; }
.art-caption { position: absolute; bottom: 5%; right: 6%; font-size: .78rem; font-weight: 700; }
.areas { border-top: 1px solid var(--line); padding: 2.5rem 0; }
.section-head { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem 2rem; align-items: end; margin-bottom: 1.5rem; }
.section-head h2,.learning-format h2 { font-size: clamp(1.65rem,3vw,2.5rem); margin: 0; }
.section-head > p { margin: 0; color: var(--muted); max-width: 34rem; }
.tiles { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; }
.tiles article { display: flex; flex-direction: column; min-width: 0; padding: 1.35rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow); }
.subject-icon { display: grid; place-items: center; width: 3.65rem; height: 3.65rem; border-radius: .9rem; font-size: 1.8rem; font-weight: 750; margin-bottom: 1.25rem; }
.maths { background: var(--soft); color: var(--brand); }
.english { background: var(--mint); color: #235b44; }
.commerce { background: var(--amber); color: #684417; }
.subject-level { color: var(--muted); font-size: .83rem; font-weight: 650; margin: 0 0 .25rem; }
.tiles h3 { font-size: 1.35rem; margin: 0 0 .45rem; }
.tiles article > p:not(.subject-level) { color: var(--muted); margin: 0 0 1.25rem; }
.preparing { align-self: flex-start; margin-top: auto; color: #53596a; font-size: .77rem; font-weight: 650; border: 1px solid var(--line); border-radius: 2rem; padding: .23rem .65rem; }
.notice { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; background: var(--soft); border-radius: var(--radius); padding: 1.25rem 1.4rem; margin-top: 1.3rem; }
.notice p { margin: .2rem 0 0; color: var(--muted); }
.notice a { color: var(--brand); font-weight: 700; }
.learning-format { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(1.3rem,3vw,2.4rem); }
.format-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; margin-top: 1.6rem; }
.format-grid article { border-top: 1px solid var(--line); padding-top: 1rem; }
.format-grid span { color: var(--brand); font-size: .82rem; font-weight: 750; }
.format-grid h3 { font-size: 1.2rem; margin: .5rem 0; }
.format-grid p { color: var(--muted); margin: 0; }
@media (max-width: 800px) { .hero { grid-template-columns: minmax(0,1fr); } .hero-art { max-width: 560px; width: 100%; height: 390px; } .tiles { grid-template-columns: repeat(2,minmax(0,1fr)); } .section-head { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .hero-art { height: 300px; min-height: 0; border-radius: 1.2rem 1.2rem 1.2rem .35rem; } .tiles,.format-grid { grid-template-columns: 1fr; } .topline nav { width: 100%; } .hero h1 { font-size: clamp(2.35rem,10vw,3.6rem); } }
</style>
