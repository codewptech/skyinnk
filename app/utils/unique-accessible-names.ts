/** Keep noncolliding first-pass names unchanged. Reserve every first-pass name
 * before assigning fallback labels, including literal suffix-shaped titles. */
export function uniqueAccessibleNames(names: readonly string[]): string[] {
  const identity = (name: string) =>
    name
      .trim()
      .replace(/\s+/gu, " ")
      .normalize("NFC")
      .toLowerCase()
      .normalize("NFC");
  const reserved = new Set(names.map(identity));
  const used = new Set<string>();
  const nextSuffix = new Map<string, number>();
  return names.map((name) => {
    const key = identity(name);
    if (!used.has(key)) {
      used.add(key);
      return name;
    }
    let suffix = nextSuffix.get(key) ?? 2;
    let candidate: string;
    do {
      candidate = `${name.trim()} (link ${suffix++})`;
    } while (
      reserved.has(identity(candidate)) ||
      used.has(identity(candidate))
    );
    nextSuffix.set(key, suffix);
    used.add(identity(candidate));
    return candidate;
  });
}
