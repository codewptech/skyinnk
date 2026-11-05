<script setup lang="ts">
definePageMeta({ middleware: ["auth0-sync"] });
const user = useUser();

useHead({
  title: "Coming Soon",
  meta: [
    {
      name: "description",
      content: "We're working on something new. Please check back soon.",
    },
  ],
  htmlAttrs: { lang: "en" },
});
</script>

<template>
  <main class="coming-soon">
    <h1>Coming Soon...</h1>
    <p>We're working on something new. Please check back soon.</p>
    <div class="authentication">
      <template v-if="user">
        <div class="profile">
          <img
            v-if="user.picture"
            :src="user.picture"
            :alt="user.name || 'User profile'"
            width="48"
            height="48"
            referrerpolicy="no-referrer"
          />
          <p v-if="user.name" class="profile-name">{{ user.name }}</p>
          <p v-if="user.email">{{ user.email }}</p>
        </div>
        <a href="/auth/logout">Log Out</a>
      </template>
      <a v-else href="/auth/login">Log In / Sign Up</a>
    </div>
  </main>
</template>

<style scoped>
.coming-soon {
  box-sizing: border-box;
  display: grid;
  place-content: center;
  padding: 2rem;
  background: #f8fafc;
  color: #0f172a;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

p {
  max-width: 34rem;
  margin: 1rem 0 0;
  color: #475569;
  font-size: 1.0625rem;
  line-height: 1.6;
}

.authentication {
  margin-top: 2rem;
}

.authentication a {
  color: inherit;
  text-underline-offset: 0.2em;
}

.authentication a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

.profile {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-wrap: anywhere;
}

.profile img {
  border-radius: 50%;
  object-fit: cover;
}

.profile p {
  margin: 0;
}

.profile-name {
  font-weight: 600;
}
</style>
