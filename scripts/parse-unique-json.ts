/** Parse native JSON syntax, rejecting repeated decoded member names per object.
 * Scan the validated source iteratively so strings and nested scopes cannot
 * conceal an overwritten approval, and deep input does not recurse in JS.
 */
export function parseUniqueJson(source: string, context: string): unknown {
  const value: unknown = JSON.parse(source);
  const scopes: (Set<string> | null)[] = [];
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "{") scopes.push(new Set());
    else if (char === "[") scopes.push(null);
    else if (char === "}" || char === "]") scopes.pop();
    else if (char === '"') {
      const start = index++;
      while (index < source.length && source[index] !== '"') {
        // Native parsing already validated every escape and closing quote.
        index += source[index] === "\\" ? 2 : 1;
      }
      let after = index + 1;
      while (/[\x20\x09\x0a\x0d]/.test(source[after] ?? "")) after++;
      if (source[after] !== ":") continue;
      const keys = scopes.at(-1);
      if (!keys) throw new SyntaxError(`${context}: invalid JSON member scope`);
      const key: string = JSON.parse(source.slice(start, index + 1));
      if (keys.has(key))
        throw new SyntaxError(`${context}: duplicate JSON object member`);
      keys.add(key);
    }
  }
  return value;
}
