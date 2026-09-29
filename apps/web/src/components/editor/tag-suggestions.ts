// The tags a partly typed name could mean: names that start with it first, then names
// that contain it, each group alphabetical. A tag already on the post is not offered.
export const TAG_SUGGESTION_LIMIT = 6;

export function suggestTags(
  known: readonly string[],
  typed: string,
  chosen: readonly string[],
): readonly string[] {
  const query = typed.trim().toLowerCase();
  if (query === "") {
    return [];
  }
  const taken = new Set(chosen.map((tag) => tag.toLowerCase()));
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of known) {
    const lower = name.toLowerCase();
    if (taken.has(lower)) {
      continue;
    }
    if (lower.startsWith(query)) {
      starts.push(name);
    } else if (lower.includes(query)) {
      contains.push(name);
    }
  }
  const byName = (a: string, b: string) => a.localeCompare(b);
  return [...starts.sort(byName), ...contains.sort(byName)].slice(
    0,
    TAG_SUGGESTION_LIMIT,
  );
}
