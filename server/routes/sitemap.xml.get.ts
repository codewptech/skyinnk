import {
  listPublicCourses,
  orderedPublicLessons,
} from "../../app/utils/public-catalogue";
export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  const paths = ["/", "/courses"];
  for (const course of listPublicCourses()) {
    paths.push(`/courses/${course.slug}`);
    for (const lesson of orderedPublicLessons(course))
      paths.push(`/courses/${course.slug}/lessons/${lesson.slug}`);
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths
      .map((path) => `<url><loc>https://www.skyinnk.in${path}</loc></url>`)
      .join("") +
    "</urlset>"
  );
});
