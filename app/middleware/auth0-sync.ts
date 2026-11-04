import type { NuxtApp } from "#app";
import {
  createAuth0SyncCoordinator,
  Auth0SyncRateLimitError,
} from "../utils/auth0-sync";

const coordinators = new WeakMap<
  NuxtApp,
  ReturnType<typeof createAuth0SyncCoordinator>
>();

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;
  const app = useNuxtApp();
  let coordinator = coordinators.get(app);
  if (!coordinator) {
    coordinator = createAuth0SyncCoordinator({
      user: useUser(),
      router: useRouter(),
      freshnessMs: Number(useRuntimeConfig().public.auth0SyncFreshnessMs),
      request: async () => {
        const response = await fetch("/api/auth/sync", {
          method: "POST",
          credentials: "same-origin",
          headers: { "X-Auth0-Sync": "1" },
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 429) {
          throw new Auth0SyncRateLimitError(
            response.headers.get("Retry-After"),
          );
        }
        if (
          response.status !== 200 ||
          (await response.json()).synced !== true
        ) {
          throw new Error("Synchronization failed");
        }
      },
    });
    coordinators.set(app, coordinator);
  }
  coordinator.enter();
});
