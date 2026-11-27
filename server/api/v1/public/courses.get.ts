import { defineEventHandler } from "h3";
import { listSourceCourses } from "../../../utils/public-catalogue-source.ts";
import { listPublicCourseSummaries } from "../../../utils/public-course-read.ts";

/** No account required. Only the build-validated public manifest is read. */
export default defineEventHandler(() =>
  listPublicCourseSummaries(listSourceCourses()),
);
