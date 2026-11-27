import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { developmentProofEnv, markDevelopmentIngress } from "./server/utils/demo-catalogue";
import { checkPublicContent } from "./scripts/validate-public-content";
import { projectLearnerCourses } from "./shared/public-content";

const learnerCourses = projectLearnerCourses(checkPublicContent());

const immutableBuildAssets = new Set<string>();

// Nuxt's outer listener sees the actual peer; Nitro dev workers may only see
// Unix-socket/proxy transport. Keep the proof private to this dev process.
const developmentToken = process.env.NODE_ENV === "development"
  ? (process.env[developmentProofEnv] ??= randomBytes(32).toString("hex"))
  : undefined;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: { host: "127.0.0.1" },
  modules: ["@auth0/auth0-nuxt"],
  auth0: { ssrUser: false },
  vite: {
    define: { __SKYINNK_LEARNER_COURSES__: JSON.stringify(learnerCourses) },
  },
  routeRules: {
    "/**": { cache: false },
    "/resources/public/**": {
      headers: { "x-content-type-options": "nosniff" },
    },
  },
  hooks: {
    listen(server) {
      if (!developmentToken) return;
      const address = server.address();
      const host = address && typeof address === "object" ? address.address : undefined;
      server.prependListener("request", (request: IncomingMessage) => {
        markDevelopmentIngress(request, host, developmentToken);
      });
    },
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
