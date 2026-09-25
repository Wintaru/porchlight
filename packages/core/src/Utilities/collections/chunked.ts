// Splits `items` into runs of at most `size`, for an `in (…)` filter: a long id list
// stays under PostgREST's URL limit and its 1000-row cap, one bounded query per run.
export function chunked<T>(items: readonly T[], size: number): T[][] {
  const runs: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    runs.push(items.slice(start, start + size));
  }
  return runs;
}
