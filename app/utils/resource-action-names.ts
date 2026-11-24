import type { PublicResource } from "../../shared/public-content";

/** Disambiguate only repeated resource titles, in the existing display order. */
export function resourceActionNames(
  resources: readonly Pick<PublicResource, "title">[],
): string[] {
  const totals = new Map<string, number>();
  for (const resource of resources) {
    totals.set(resource.title, (totals.get(resource.title) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return resources.map(({ title }) => {
    if (totals.get(title) === 1) return title;
    const occurrence = (seen.get(title) ?? 0) + 1;
    seen.set(title, occurrence);
    return `${title} (resource ${occurrence} of ${totals.get(title)})`;
  });
}
