import { createError, defineEventHandler, getHeader, getRequestHost, setHeader } from "h3";
import { developmentProofHeader, developmentProofEnv, loadDevelopmentCatalogue, readDevelopmentCatalogue } from "../../../utils/demo-catalogue.ts";

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  try {
    return await loadDevelopmentCatalogue(
      true,
      getRequestHost(event, { xForwardedHost: false }),
      getHeader(event, developmentProofHeader), process.env[developmentProofEnv],
      async () => {
        const { default: prisma } = await import("../../../utils/prisma.ts");
        return readDevelopmentCatalogue(prisma);
      },
    );
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Learning catalogue temporarily unavailable" });
  }
});
