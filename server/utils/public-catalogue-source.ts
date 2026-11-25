import catalogue from "../../content/catalogue.json";
import { validatePublicCatalogue } from "../../shared/public-content.ts";

/** Server-only reviewed source; never imported by learner pages. */
export function listSourceCourses() {
  return validatePublicCatalogue(catalogue).courses;
}
