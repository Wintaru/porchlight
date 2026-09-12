import type { Tables } from "@porchlight/db";

import type { Comment } from "../../Common/Comment";
import type { ContentAuthor } from "../../Common/ContentAuthor";

// The columns every comment read names. Never `select *`: the shape here is the one the
// mapper below expects. One literal on purpose: the client parses the select string at
// the type level, and a concatenation would widen it to `string`.
export const COMMENT_COLUMNS =
  "id, post_id, parent_id, author_id, anonymous_author_id, body_md, body_html, depth, status, created_at, updated_at";

export type CommentRow = Pick<
  Tables<"comments">,
  | "id"
  | "post_id"
  | "parent_id"
  | "author_id"
  | "anonymous_author_id"
  | "body_md"
  | "body_html"
  | "depth"
  | "status"
  | "created_at"
  | "updated_at"
>;

// The status assignment only compiles while the schema's values are all in the domain
// union; toComment.test.ts checks the other direction against the generated constants.
export function toComment(row: CommentRow): Comment {
  const base = {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    depth: row.depth,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
  if (row.status === "tombstone") {
    return { ...base, status: "tombstone" };
  }
  return {
    ...base,
    status: row.status,
    author: toAuthor(row),
    bodyMd: row.body_md,
    bodyHtml: row.body_html,
  };
}

// The `comments_one_author_or_tombstone` CHECK guarantees a live row has exactly one
// author column set. A row that breaks it can only come from a schema change, so it is
// a thrown error here, not a response.
function toAuthor(
  row: Pick<CommentRow, "id" | "author_id" | "anonymous_author_id">,
): ContentAuthor {
  if (row.author_id !== null) {
    return { kind: "member", profileId: row.author_id };
  }
  if (row.anonymous_author_id !== null) {
    return { kind: "anonymous", anonymousAuthorId: row.anonymous_author_id };
  }
  throw new Error(`comment ${row.id} has no author`);
}
