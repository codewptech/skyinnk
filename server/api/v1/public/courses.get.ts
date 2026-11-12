import { defineEventHandler } from "h3";
import { listPublicCourses } from "../../../../app/utils/public-catalogue.ts";
import { listPublicCourseSummaries } from "../../../utils/public-course-read.ts";

/** No account required. Only the build-validated public manifest is read. */
export default defineEventHandler(() =>
  listPublicCourseSummaries(listPublicCourses()),
);
