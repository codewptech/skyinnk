import prisma from "../../utils/prisma.ts";

// Separate from /api/v1/health: readiness requires a working native engine and migrated schema.
export default defineEventHandler(async () => {
  try {
    await prisma.user.findFirst({ select: { id: true } });
    return { status: "ready" };
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Database not ready" });
  }
});
