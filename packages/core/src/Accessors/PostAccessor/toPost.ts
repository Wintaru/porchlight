import type { Tables } from "@porchlight/db";

import type { Post } from "../../Common/Post";
import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { Tag } from "../../Common/Tag";

// The columns every post read names, with the post's tags embedded through post_tags.
// Never `select *`: the shape here is the one the mapper below expects. One literal on
// purpose: the client parses the select string at the type level, and a concatenation
// would widen it to `string` and lose the row type.
export const POST_COLUMNS =
  "id, author_id, anonymous_author_id, slug, title, body_md, body_html, summary, cover_media_id, status, visibility, comments_enabled, rejection_reason, origin, agent_token_id, reviewed_at, published_at, created_at, updated_at, post_tags(tag:tags(slug, name))";

export type PostRow = Pick<
  Tables<"posts">,
  | "id"
  | "author_id"
  | "anonymous_author_id"
  | "slug"
  | "title"
  | "body_md"
  | "body_html"
  | "summary"
  | "cover_media_id"
  | "status"
  | "visibility"
  | "comments_enabled"
  | "rejection_reason"
  | "origin"
  | "agent_token_id"
  | "reviewed_at"
  | "published_at"
  | "created_at"
  | "updated_at"
> & {
  readonly post_tags: readonly { readonly tag: Tag | null }[];
};

// The domain unions in Common restate the schema's enums, because Common cannot import
// packages/db. The assignments below only compile while the schema's values are all in
// the domain union; toPost.test.ts checks the other direction against the generated
// constants, so a value added on either side without the other fails the gate.
export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    author: toAuthor(row),
    slug: row.slug,
    title: row.title,
    bodyMd: row.body_md,
    bodyHtml: row.body_html,
    summary: row.summary,
    coverMediaId: row.cover_media_id,
    status: row.status,
    visibility: row.visibility,
    commentsEnabled: row.comments_enabled,
    rejectionReason: row.rejection_reason,
    origin: row.origin,
    agentTokenId: row.agent_token_id,
    reviewedAt: row.reviewed_at === null ? null : new Date(row.reviewed_at),
    tags: row.post_tags.flatMap((link) => (link.tag === null ? [] : [link.tag])),
    publishedAt: row.published_at === null ? null : new Date(row.published_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// The `posts_one_author` CHECK guarantees exactly one of the two columns is set. A row
// that breaks it can only come from a schema change, so it is a thrown error here, not
// a response.
function toAuthor(
  row: Pick<PostRow, "id" | "author_id" | "anonymous_author_id">,
): ContentAuthor {
  if (row.author_id !== null) {
    return { kind: "member", profileId: row.author_id };
  }
  if (row.anonymous_author_id !== null) {
    return { kind: "anonymous", anonymousAuthorId: row.anonymous_author_id };
  }
  throw new Error(`post ${row.id} has no author`);
}
