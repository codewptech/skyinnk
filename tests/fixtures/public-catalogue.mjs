// Synthetic UI/security fixtures only. Never copied into the production catalogue.
export function publicCatalogueFixture() {
  const publication = {
    status: "published",
    visibility: "public",
    reviewedBy: "TEST FIXTURE ONLY",
    reviewedAt: "2026-11-11T00:00:00.000Z",
  };
  const lesson = (key, slug, position) => ({
    key,
    slug,
    title: `Fixture ${slug}`,
    position,
    kind: "text",
    overview: "Synthetic test material.",
    notesMarkdown:
      "## Test notes\n\nPublic fixture marker. $x^2$\n\n<script>hostile()</script>",
    publication: { ...publication },
  });
  return {
    schemaVersion: 1,
    courses: [
      {
        key: "fixture-course",
        slug: "fixture-course",
        title: "Synthetic fixture course",
        summary: "Test fixture, not educational content.",
        audience: "Test only",
        subject: "Test",
        publication: { ...publication },
        modules: [
          {
            key: "fixture-module-one",
            title: "First module",
            position: 0,
            lessons: [
              {
                ...lesson("fixture-video", "video", 0),
                kind: "video",
                video: { provider: "youtube", publicId: "abcdefghijk" },
              },
            ],
          },
          {
            key: "fixture-module-two",
            title: "Second module",
            position: 1,
            lessons: [lesson("fixture-text", "text", 0)],
          },
        ],
      },
    ],
  };
}
