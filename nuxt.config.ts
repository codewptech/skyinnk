const immutableBuildAssets = new Set<string>();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@auth0/auth0-nuxt"],
  auth0: { ssrUser: false },
  routeRules: {
    "/**": { cache: false },
  },
  hooks: {
    "build:manifest"(manifest) {
      immutableBuildAssets.clear();
      for (const entry of Object.values(manifest)) {
        for (const file of [
          entry.file,
          ...(entry.css ?? []),
          ...(entry.assets ?? []),
        ]) {
          // Only actual manifest entries with Vite's content hash are approved.
          if (file && /(?:^|[./-])[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(file)) {
            immutableBuildAssets.add(
              file.startsWith("_nuxt/") ? `/${file}` : `/_nuxt/${file}`,
            );
          }
        }
      }
    },
    "nitro:config"(config) {
      config.virtual ??= {};
      config.virtual["#immutable-build-assets"] = () =>
        `export default ${JSON.stringify([...immutableBuildAssets])};`;
    },
  },
  runtimeConfig: {
    public: {
      auth0SyncFreshnessMs: 300_000,
      gtmId: "GTM-5ZH9SBK5",
      analyticsEnabled: false,
    },
    auth0SyncRateLimit: { maxRequests: 10, windowMs: 60_000 },
    auth0: {
      // NUXT_AUTH0_* overrides these at startup. Never compile credentials into defaults.
      domain: "",
      clientId: "",
      clientSecret: "",
      sessionSecret: "",
      appBaseUrl: "",
    },
  },
});
