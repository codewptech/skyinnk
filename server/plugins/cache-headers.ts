import { getRequestURL } from "h3";
import immutableBuildAssets from "#immutable-build-assets";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "cdn-cache-control": "no-store",
  "cloudflare-cdn-cache-control": "no-store",
};
const publicHeaders = {
  "cache-control": "public, max-age=31536000, immutable",
  "cdn-cache-control": "public, max-age=31536000",
  "cloudflare-cdn-cache-control": "public, max-age=31536000",
};

export default defineNitroPlugin((nitroApp) => {
  const immutable = new Set(immutableBuildAssets);
  nitroApp.hooks.hook("request", (event) => {
    const response = event.node.res;
    const writeHead = response.writeHead;
    // The existing deployment is Nitro's Node server. Its error handler can send
    // directly, bypassing beforeResponse; enforce policy at final header emission.
    response.writeHead = function (statusCode: number, ...args: unknown[]) {
      const index = typeof args[0] === "string" ? 1 : 0;
      const supplied = args[index];
      const entries: [string, unknown][] = Array.isArray(supplied)
        ? Array.from({ length: supplied.length / 2 }, (_, i) => [
            String(supplied[i * 2]),
            supplied[i * 2 + 1],
          ])
        : supplied && typeof supplied === "object"
          ? Object.entries(supplied)
          : [];
      const hasCookie =
        response.hasHeader("set-cookie") ||
        entries.some(([key]) => key.toLowerCase() === "set-cookie");
      const approved =
        ["GET", "HEAD"].includes(event.method) &&
        [200, 304].includes(statusCode) &&
        immutable.has(getRequestURL(event).pathname) &&
        !hasCookie;
      const policy = approved ? publicHeaders : privateHeaders;
      // Replace only these three headers, preserving cookies and every other header.
      for (const [key, value] of Object.entries(policy))
        response.setHeader(key, value);
      if (supplied && typeof supplied === "object") {
        const kept = entries.filter(
          ([key]) => !Object.hasOwn(policy, key.toLowerCase()),
        );
        args[index] = Array.isArray(supplied)
          ? [...kept, ...Object.entries(policy)].flat()
          : Object.fromEntries([...kept, ...Object.entries(policy)]);
      }
      return Reflect.apply(writeHead, this, [statusCode, ...args]);
    };
  });
});
