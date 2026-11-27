import { createError, defineEventHandler, getRouterParam } from "h3";
import { listSourceCourses } from "../../../../utils/public-catalogue-source.ts";
import { readPublicCourseOutline } from "../../../../utils/public-course-read.ts";

export default defineEventHandler((event) => {
  const data = readPublicCourseOutline(
    listSourceCourses(),
    getRouterParam(event, "courseSlug") ?? "",
  );
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Course not published",
    });
  }
  return data;
});
