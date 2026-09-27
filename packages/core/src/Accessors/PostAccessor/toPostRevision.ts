import type { Tables } from "@porchlight/db";

import type { PostRevision } from "../../Common/PostRevision";

export const POST_REVISION_COLUMNS =
  "id, post_id, title, summary, body_md, saved_at, replaced_at";

type PostRevisionRow = Pick<
  Tables<"post_revisions">,
  "id" | "post_id" | "title" | "summary" | "body_md" | "saved_at" | "replaced_at"
>;

export function toPostRevision(row: PostRevisionRow): PostRevision {
  return {
    id: row.id,
    postId: row.post_id,
    title: row.title,
    summary: row.summary,
    bodyMd: row.body_md,
    savedAt: new Date(row.saved_at),
    replacedAt: new Date(row.replaced_at),
  };
}
