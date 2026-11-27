import { createError, defineEventHandler, getHeader, getRequestHost, setHeader } from "h3";
import { demoProofHeader, demoProofEnv, loadDemoPreview, readDemoCatalogue } from "../../../utils/demo-catalogue.ts";

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  try {
    return await loadDemoPreview(
      true, process.env.SKYINNK_DEMO_PREVIEW,
      getRequestHost(event, { xForwardedHost: false }),
      getHeader(event, demoProofHeader), process.env[demoProofEnv],
      async () => {
        const { default: prisma } = await import("../../../utils/prisma.ts");
        return readDemoCatalogue(prisma);
      },
    );
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Demo catalogue temporarily unavailable" });
  }
});
