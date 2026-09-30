import type { Json } from "@porchlight/db";

// The one query: every row's key and value, as PostgREST answers it.
export type SiteConfigRowsQuery = () => PromiseLike<{
  readonly data: readonly { readonly key: string; readonly value: Json }[] | null;
  readonly error: { readonly message: string } | null;
}>;

type Read<T> =
  | { readonly data: T; readonly error: null }
  | { readonly data: null; readonly error: { readonly message: string } };

// Every `site_config` row in one read, kept for `ttlMs`. Permission checks, uploads and
// every page read a key or two, and each used to be its own round trip. A save on this
// server forgets the copy at once; another server instance sees it within `ttlMs`. A
// read that fails is not kept, so the next call asks again.
export class SiteConfigCache {
  private current:
    | { readonly at: number; readonly rows: Promise<Read<ReadonlyMap<string, Json>>> }
    | undefined;

  constructor(
    private readonly query: SiteConfigRowsQuery,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  // One key's row, or null when the table has none: the shape `.maybeSingle()` answers.
  async row(key: string): Promise<Read<{ readonly value: Json } | null>> {
    const read = await this.all();
    if (read.error !== null) {
      return read;
    }
    const value = read.data.get(key);
    return { data: value === undefined ? null : { value }, error: null };
  }

  // The rows for these keys that exist.
  async rows(
    keys: readonly string[],
  ): Promise<Read<readonly { readonly key: string; readonly value: Json }[]>> {
    const read = await this.all();
    if (read.error !== null) {
      return read;
    }
    return {
      data: keys.flatMap((key) => {
        const value = read.data.get(key);
        return value === undefined ? [] : [{ key, value }];
      }),
      error: null,
    };
  }

  forget(): void {
    this.current = undefined;
  }

  private all(): Promise<Read<ReadonlyMap<string, Json>>> {
    const at = this.now();
    if (this.current !== undefined && at - this.current.at < this.ttlMs) {
      return this.current.rows;
    }
    const rows = this.load();
    const entry = { at, rows };
    this.current = entry;
    void rows.then((read) => {
      if (read.error !== null && this.current === entry) {
        this.current = undefined;
      }
    });
    return rows;
  }

  // Never rejects: a thrown query is a failed read like any other, and is not kept.
  private async load(): Promise<Read<ReadonlyMap<string, Json>>> {
    let answer;
    try {
      answer = await this.query();
    } catch (error: unknown) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
    const { data, error } = answer;
    if (error !== null || data === null) {
      return { data: null, error: { message: error?.message ?? "no rows and no error" } };
    }
    return { data: new Map(data.map((row) => [row.key, row.value])), error: null };
  }
}
