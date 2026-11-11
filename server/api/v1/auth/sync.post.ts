import { Prisma } from "@prisma/client";
import {
  createError,
  getRequestHeader,
  defineEventHandler,
  setResponseHeader,
} from "h3";
import { syncAuth0User, validAuth0Subject } from "../../../utils/auth0-user.ts";
import { createAuth0SyncRateLimiter } from "../../../utils/auth0-sync-rate-limit.ts";

let rateLimiter: ReturnType<typeof createAuth0SyncRateLimiter> | undefined;

export default defineEventHandler(async (event) => {
  const configuredOrigin = new URL(useRuntimeConfig(event).auth0.appBaseUrl)
    .origin;
  const origin = getRequestHeader(event, "origin");
  const fetchSite = getRequestHeader(event, "sec-fetch-site");
  // Exact configured origin + a non-simple header blocks cross-origin form/CSRF requests.
  // Never derive the trusted origin from Host or forwarded headers.
  if (
    origin !== configuredOrigin ||
    getRequestHeader(event, "x-auth0-sync") !== "1" ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    throw createError({ statusCode: 403, statusMessage: "Request rejected" });
  }
  // This endpoint accepts no body. Reject framed bodies without buffering them.
  const length = getRequestHeader(event, "content-length");
  if (
    (length !== undefined && length !== "0") ||
    getRequestHeader(event, "transfer-encoding")
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Request body is not allowed",
    });
  }
  const session = await useAuth0(event).getSession();
  if (!session?.user || !validAuth0Subject(session.user.sub)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }
  if (!rateLimiter) {
    const policy = useRuntimeConfig(event).auth0SyncRateLimit;
    try {
      rateLimiter = createAuth0SyncRateLimiter({
        maxRequests: Number(policy.maxRequests),
        windowMs: Number(policy.windowMs),
      });
    } catch {
      // Invalid configuration must not silently disable protection.
      throw createError({
        statusCode: 503,
        statusMessage: "Synchronization temporarily unavailable",
      });
    }
  }
  const decision = rateLimiter.consume(session.user.sub);
  if (!decision.allowed) {
    if (decision.reason === "quota") {
      setResponseHeader(event, "Retry-After", decision.retryAfterSeconds);
      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
      });
    }
    throw createError({
      statusCode: 503,
      statusMessage: "Synchronization temporarily unavailable",
    });
  }

  try {
    await syncAuth0User(session.user);
    return { synced: true };
  } catch (error) {
    const unavailable =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1001", "P1002", "P1008", "P1017", "P2024", "P2037"].includes(
          error.code,
        ));
    // Do not expose database URLs, SQL details, tokens or user claims in errors.
    throw createError({
      statusCode: unavailable ? 503 : 500,
      statusMessage: unavailable
        ? "Synchronization temporarily unavailable"
        : "Synchronization failed",
    });
  }
});
