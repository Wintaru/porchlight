import type { Tables } from "@porchlight/db";

import type { AnonymousAuthor } from "../../Common/AnonymousAuthor";

export type AnonymousAuthorRow = Pick<
  Tables<"anonymous_authors">,
  "id" | "claimed_by" | "created_at"
>;

export function toAnonymousAuthor(row: AnonymousAuthorRow): AnonymousAuthor {
  return {
    id: row.id,
    claimedBy: row.claimed_by,
    createdAt: new Date(row.created_at),
  };
}
