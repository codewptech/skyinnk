import { createError, defineEventHandler, getQuery } from "h3";
import prisma from "../../../utils/prisma.ts";
import { validAuth0Subject } from "../../../utils/auth0-user.ts";
import { AcademicAuthoringError, listAcademicAuthoringCourses } from "../../../utils/academic-authoring-access.ts";

// Private, read-only CMS entry point. No account creation or grants on GET.
export default defineEventHandler(async (event) => {
  const session = await useAuth0(event).getSession();
  const subject = session?.user?.sub;
  if (!validAuth0Subject(subject)) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  try {
    return await prisma.$transaction(
      (tx) => listAcademicAuthoringCourses(tx, subject, getQuery(event)),
      { isolationLevel: "RepeatableRead" },
    );
  } catch (error) {
    if (error instanceof AcademicAuthoringError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message });
    }
    // Do not expose Prisma errors, SQL or identity information to the client.
    throw createError({ statusCode: 503, statusMessage: "Academic workspace unavailable" });
  }
});
