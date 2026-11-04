import { createHash } from "node:crypto";

type Decision =
  | { allowed: true }
  | { allowed: false; reason: "quota"; retryAfterSeconds: number }
  | { allowed: false; reason: "capacity" };

/** Process-local rolling window. Call only after server session verification. */
export function createAuth0SyncRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  maxIdentities?: number;
  now?: () => number;
}) {
  const { maxRequests, windowMs, maxIdentities = 10_000 } = options;
  for (const value of [maxRequests, windowMs, maxIdentities]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError("Rate limit settings must be positive safe integers");
    }
  }
  const now = options.now ?? (() => performance.now());
  const requests = new Map<string, number[]>();
  let nextCleanup = 0;

  return {
    consume(subject: string): Decision {
      const time = now();
      const cutoff = time - windowMs;
      // No background timers. Bound both memory and cleanup work under load.
      if (time >= nextCleanup) {
        for (const [key, timestamps] of requests) {
          if (timestamps[timestamps.length - 1]! <= cutoff)
            requests.delete(key);
        }
        nextCleanup = time + Math.min(windowMs, 1000);
      }
      // Keep no raw identity claims or session tokens in the limiter.
      const key = createHash("sha256").update(subject, "utf16le").digest("hex");
      const timestamps =
        requests.get(key)?.filter((time) => time > cutoff) ?? [];
      if (timestamps.length >= maxRequests) {
        return {
          allowed: false,
          reason: "quota",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((timestamps[0]! + windowMs - time) / 1000),
          ),
        };
      }
      // Never evict active quotas to admit another identity: that enables bypass.
      if (!requests.has(key) && requests.size >= maxIdentities) {
        return { allowed: false, reason: "capacity" };
      }
      // Synchronous consumption is atomic within the Node event loop, before I/O.
      timestamps.push(time);
      requests.set(key, timestamps);
      return { allowed: true };
    },
  };
}
