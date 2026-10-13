import type { PageCursor } from "@/read-model/post-card";

import { isEntityId } from "./entity-id";

// A list's `?before=` value: the last card's publish time and id, joined by `_`, which
// neither carries. The time stays as Postgres wrote it, microseconds and all: a JS Date
// keeps only milliseconds, and a rounded time would skip or repeat a post at the edge.
const SEPARATOR = "_";
const POSTGRES_TIME =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,6})?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/;

export function pageCursorParam(cursor: PageCursor): string {
  return `${cursor.publishedAt}${SEPARATOR}${cursor.id}`;
}

// Undefined for anything that is not a cursor in shape, so a typed or stale URL shows the
// first page. The shape check is what makes the value safe to put in a filter.
export function parsePageCursor(raw: unknown): PageCursor | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const [publishedAt, id, ...rest] = raw.split(SEPARATOR);
  if (
    publishedAt === undefined ||
    id === undefined ||
    rest.length > 0 ||
    !isRealTime(publishedAt) ||
    !isEntityId(id)
  ) {
    return undefined;
  }
  return { publishedAt, id };
}

// The shape, and a date and time that exist: Postgres refuses `02-30` or `24:00`, and a
// refused cursor would be an error page instead of the first page. A JS Date rolls those
// over to another day, so a field that does not come back unchanged was not real.
function isRealTime(publishedAt: string): boolean {
  const fields = POSTGRES_TIME.exec(publishedAt)?.[1];
  if (fields === undefined) {
    return false;
  }
  const parsed = new Date(`${fields}Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(fields);
}

// The address of a list page: `path` with its own query, plus `before` when there is one.
export function listPageHref(
  path: string,
  query: Readonly<Record<string, string>>,
  before: PageCursor | undefined,
): string {
  const params = new URLSearchParams(query);
  if (before !== undefined) {
    params.set("before", pageCursorParam(before));
  }
  const search = params.toString();
  return search === "" ? path : `${path}?${search}`;
}
