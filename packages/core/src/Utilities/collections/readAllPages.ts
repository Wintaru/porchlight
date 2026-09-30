// PostgREST answers at most `max_rows` rows a request (1000 by default), and some reads
// must hold every row: an export, an erasure. This one pages with `range` until a page
// comes back empty, stepping by what came back, so a lower cap on the server costs
// extra reads, never missing rows. The query must order by a unique key, or a row can
// move between pages. A row deleted mid-read shifts the later ones up, so one can be
// skipped; keyset paging would close that gap.
const PAGE_SIZE = 1000;

export interface Page<T> {
  readonly data: readonly T[] | null;
  readonly error: { readonly message: string } | null;
}

export type AllPages<T> = { readonly rows: readonly T[] } | { readonly error: string };

export async function readAllPages<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<AllPages<T>> {
  const rows: T[] = [];
  for (let from = 0; ;) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error !== null) {
      return { error: error.message };
    }
    if (data === null || data.length === 0) {
      return { rows };
    }
    rows.push(...data);
    from += data.length;
  }
}
