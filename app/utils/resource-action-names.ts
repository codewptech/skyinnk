import { uniqueAccessibleNames } from "./unique-accessible-names.ts";
import type { PublicResource } from "../../shared/public-content";

/** Disambiguate only repeated resource titles, in the existing display order. */
export function resourceActionNames(
  resources: readonly Pick<PublicResource, "title">[],
): string[] {
  const identity = (title: string) => title.trim().replace(/\s+/gu, " ").normalize("NFC").toLowerCase().normalize("NFC");
  const totals = new Map<string, number>();
  for (const resource of resources) {
    const key = identity(resource.title);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return uniqueAccessibleNames(resources.map(({ title }) => {
    const key = identity(title);
    if (totals.get(key) === 1) return title;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return `${title.trim().replace(/\s+/gu, " ")} (resource ${occurrence} of ${totals.get(key)})`;
  }));
}
