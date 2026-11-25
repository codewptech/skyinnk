import { listSourceCourses } from "../utils/public-catalogue-source.ts";
export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  const paths = ["/", "/courses", "/privacy-policy", "/terms-of-service"];
  for (const course of listSourceCourses()) {
    paths.push(`/courses/${course.slug}`);
    for (const module of [...course.modules].sort((a, b) => a.position - b.position))
      for (const lesson of [...module.lessons].sort((a, b) => a.position - b.position))
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
