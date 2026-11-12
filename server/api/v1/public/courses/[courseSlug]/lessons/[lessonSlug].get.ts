import { createError, defineEventHandler, getRouterParam } from "h3";
import { listPublicCourses } from "../../../../../../../app/utils/public-catalogue.ts";
import { readPublicLesson } from "../../../../../../utils/public-course-read.ts";

export default defineEventHandler((event) => {
  const data = readPublicLesson(
    listPublicCourses(),
    getRouterParam(event, "courseSlug") ?? "",
    getRouterParam(event, "lessonSlug") ?? "",
  );
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Lesson not published" });
  }
  return data;
});
