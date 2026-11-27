import { createError, defineEventHandler, getRequestHost, setHeader } from "h3";
import { demoPreviewEnabled, readDemoCatalogue } from "../../../utils/demo-catalogue.ts";

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: "Not found" });
  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  if (!demoPreviewEnabled(true, process.env.SKYINNK_DEMO_PREVIEW, getRequestHost(event, { xForwardedHost: false }))) {
    return { enabled: false, courses: [] };
  }
  try {
    const { default: prisma } = await import("../../../utils/prisma.ts");
    return { enabled: true, courses: await readDemoCatalogue(prisma) };
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Demo catalogue temporarily unavailable" });
  }
});
