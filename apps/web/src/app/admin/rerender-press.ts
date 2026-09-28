import { isEntityId } from "@/lib/entity-id";

// One press of the Maintenance button (#98, C24): posts first, then comments, sharing
// one budget of bodies. The cursor names the table and the row to resume after. It
// lives only in the form and the address, never in the database, so a press that
// stops holds nothing and a later press may start from anywhere.

export const RERENDER_TABLES = ["posts", "comments"] as const;

export type RerenderTable = (typeof RERENDER_TABLES)[number];

export interface RerenderCursor {
  readonly table: RerenderTable;
  // Null starts the table from its first row.
  readonly afterId: string | null;
}

export const RERENDER_START: RerenderCursor = { table: "posts", afterId: null };

// What one table's run reported, that it refused the cursor, or that it failed.
export type TableRunResult =
  | {
      readonly checked: number;
      readonly changed: number;
      readonly skipped: number;
      readonly resumeAfterId: string | null;
    }
  | "rejected"
  | "failed";

export type TableRun = (
  afterId: string | null,
  maxBodies: number,
) => Promise<TableRunResult>;

// Counts are for this press only (C24).
export type PressOutcome =
  | { readonly kind: "done"; readonly changed: number; readonly skipped: number }
  | {
      readonly kind: "stopped";
      readonly changed: number;
      readonly skipped: number;
      readonly next: RerenderCursor;
    }
  | { readonly kind: "rejected" }
  | { readonly kind: "failed" };

// A cursor from a form or an address. Missing fields start at the beginning. A table
// that is not known, or a row that is not an id, is refused.
export function parseRerenderCursor(
  table: unknown,
  after: unknown,
): RerenderCursor | undefined {
  if (table === null || table === undefined || table === "") {
    return after === null || after === undefined || after === ""
      ? RERENDER_START
      : undefined;
  }
  const known = RERENDER_TABLES.find((name) => name === table);
  if (known === undefined) {
    return undefined;
  }
  if (after === null || after === undefined || after === "") {
    return { table: known, afterId: null };
  }
  return typeof after === "string" && isEntityId(after)
    ? { table: known, afterId: after }
    : undefined;
}

export async function rerenderPress(
  cursor: RerenderCursor,
  budget: number,
  runs: Readonly<Record<RerenderTable, TableRun>>,
): Promise<PressOutcome> {
  let room = budget;
  let changed = 0;
  let skipped = 0;
  let afterId = cursor.afterId;
  const start = RERENDER_TABLES.indexOf(cursor.table);
  for (const table of RERENDER_TABLES.slice(start)) {
    // The budget ran out at the end of the table before: the next press starts this
    // one, so no run reads with a budget of 0.
    if (room <= 0) {
      return { kind: "stopped", changed, skipped, next: { table, afterId: null } };
    }
    const result = await runs[table](afterId, room);
    if (result === "rejected" || result === "failed") {
      return { kind: result };
    }
    changed += result.changed;
    skipped += result.skipped;
    if (result.resumeAfterId !== null) {
      return {
        kind: "stopped",
        changed,
        skipped,
        next: { table, afterId: result.resumeAfterId },
      };
    }
    room -= result.checked;
    afterId = null;
  }
  return { kind: "done", changed, skipped };
}
