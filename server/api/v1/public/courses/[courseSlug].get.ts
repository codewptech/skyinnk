import { createError, defineEventHandler, getRouterParam } from "h3";
import { listPublicCourses } from "../../../../../app/utils/public-catalogue.ts";
import { readPublicCourseOutline } from "../../../../utils/public-course-read.ts";

export default defineEventHandler((event) => {
  const data = readPublicCourseOutline(
    listPublicCourses(),
    getRouterParam(event, "courseSlug") ?? "",
  );
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Course not published" });
  }
  return data;
});
