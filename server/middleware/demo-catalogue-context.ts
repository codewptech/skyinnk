import { defineEventHandler, getHeader, getRequestHost, setHeader } from "h3";
import { developmentCatalogueAuthorized, developmentProofHeader, developmentProofEnv, loadDevelopmentCatalogue, readDevelopmentCatalogue } from "../utils/demo-catalogue.ts";

/** SSR must use the original request's transport, not a synthetic local API call. */
export default defineEventHandler((event) => {
  if (!import.meta.dev) return;
  const pathname = event.path.split("?")[0] ?? "";
  if (pathname !== "/courses" && !pathname.startsWith("/courses/")) return;
  const host = getRequestHost(event, { xForwardedHost: false });
  const proof = getHeader(event, developmentProofHeader);
  const token = process.env[developmentProofEnv];
  if (!developmentCatalogueAuthorized(true, host, proof, token)) return;
  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  event.context.skyinnkDevelopmentCatalogue = () => loadDevelopmentCatalogue(
    true, host, proof, token,
    async () => {
      const { default: prisma } = await import("../utils/prisma.ts");
      return readDevelopmentCatalogue(prisma);
    },
  );
});
