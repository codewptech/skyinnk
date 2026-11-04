import { watch, type Ref } from "vue";
import type { Router, RouteLocationNormalized } from "vue-router";

type User = { sub: string } | undefined;
const eligible = (route: RouteLocationNormalized) => {
  const middleware = route.meta.middleware;
  return Array.isArray(middleware)
    ? middleware.includes("auth0-sync")
    : middleware === "auth0-sync";
};

/** Carry the server's retry delay without coupling the coordinator to a transport. */
export class Auth0SyncRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfter: string | null, now = Date.now()) {
    super("Synchronization rate limited");
    const value = retryAfter?.trim();
    const delay =
      value && /^\d+$/.test(value)
        ? Number(value) * 1000
        : value && /^[A-Za-z]{3}, /.test(value)
          ? Date.parse(value) - now
          : NaN;
    // A malformed/past header keeps the existing bounded failure cooldown.
    this.retryAfterMs =
      Number.isSafeInteger(delay) && delay > 0 ? delay : 30_000;
  }
}

/** Browser-runtime state only. Never used as authentication or proof of a database user. */
export function createAuth0SyncCoordinator(options: {
  user: Ref<User>;
  router: Router;
  request: () => Promise<unknown>;
  freshnessMs: number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  const freshnessMs =
    Number.isFinite(options.freshnessMs) && options.freshnessMs > 0
      ? options.freshnessMs
      : 300_000;
  let state:
    | {
        subject: string;
        succeededAt?: number;
        retryAt: number;
        inFlight?: Promise<void>;
      }
    | undefined;
  let stopUser: (() => void) | undefined;
  let stopNavigation: (() => void) | undefined;

  function synchronize() {
    const subject = options.user.value?.sub;
    if (!subject) {
      state = undefined;
      return Promise.resolve();
    }
    if (state?.subject !== subject) state = { subject, retryAt: 0 };
    const current = state;
    if (current.inFlight) return current.inFlight;
    if (
      (current.succeededAt !== undefined &&
        now() - current.succeededAt < freshnessMs) ||
      now() < current.retryAt
    )
      return Promise.resolve();
    current.inFlight = (async () => {
      try {
        await Promise.resolve().then(options.request);
        current.succeededAt = now();
        current.retryAt = 0;
      } catch (error) {
        // One bounded request per attempt; retry on a later eligible visit after cooldown.
        current.succeededAt = undefined;
        current.retryAt =
          now() +
          (error instanceof Auth0SyncRateLimitError
            ? error.retryAfterMs
            : 30_000);
      } finally {
        current.inFlight = undefined;
      }
    })();
    return current.inFlight;
  }

  function dispose() {
    stopUser?.();
    stopUser = undefined;
    stopNavigation?.();
    stopNavigation = undefined;
  }

  function enter() {
    if (!stopNavigation) {
      // Exists only while entering/visiting an eligible page; removed on departure.
      stopNavigation = options.router.afterEach((to, _from, failure) => {
        if (failure) {
          if (!eligible(options.router.currentRoute.value)) dispose();
          return;
        }
        if (!eligible(to)) {
          dispose();
          return;
        }
        if (!stopUser) {
          // The SDK fills useUser() after its asynchronous /auth/profile request.
          // Keep this scoped subscription until departure, including while initially undefined.
          stopUser = watch(
            () => options.user.value?.sub,
            () => {
              void synchronize();
            },
            { immediate: true, flush: "sync" },
          );
        } else {
          void synchronize();
        }
      });
    }
    if (eligible(options.router.currentRoute.value)) {
      if (!stopUser)
        stopUser = watch(
          () => options.user.value?.sub,
          () => {
            void synchronize();
          },
          { immediate: true, flush: "sync" },
        );
      else void synchronize();
    }
  }
  return { enter, dispose, synchronize };
}
