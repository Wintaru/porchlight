import type { DbClient, Enums } from "@porchlight/db";

import type { PostCardAuthor } from "./post-card";

// Everything the post page renders per comment. `body_html` is the sanitized render
// cached on save (D3). Read under RLS: everyone gets visible comments and tombstones,
// a member also gets their own in any status (`comments_own_read`). The profiles join
// resolves the handle; an anonymous author (#8) has no profile and shows as the
// raccoon.
const COMMENT_PAGE_COLUMNS =
  "id, parent_id, depth, status, body_html, created_at, author_id, anonymous_author_id, author:profiles!comments_author_id_fkey(handle, display_name, avatar_url)";

export interface CommentPage {
  readonly id: string;
  readonly parent_id: string | null;
  readonly depth: number;
  readonly status: Enums<"comment_status">;
  readonly body_html: string;
  readonly created_at: string;
  readonly author_id: string | null;
  readonly anonymous_author_id: string | null;
  readonly author: PostCardAuthor | null;
}

// One comment with its replies, oldest first inside a thread (SPEC.md §5).
export interface CommentPageNode {
  readonly comment: CommentPage;
  readonly replies: readonly CommentPageNode[];
}

// Oldest first, so the tree builder sees every parent before its replies and a thread
// reads in order.
export async function loadCommentsForPost(
  db: DbClient,
  postId: string,
): Promise<readonly CommentPageNode[]> {
  const { data, error } = await db
    .from("comments")
    .select(COMMENT_PAGE_COLUMNS)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`comments for ${postId}: ${error.message}`);
  }
  return buildTree(data);
}

// A reply whose parent the reader cannot see (a pending parent) has no place to hang
// and is left out, the same rule the Manager's tree applies.
function buildTree(comments: readonly CommentPage[]): readonly CommentPageNode[] {
  const nodes = new Map<string, MutableNode>();
  const roots: MutableNode[] = [];
  for (const comment of comments) {
    const node: MutableNode = { comment, replies: [] };
    nodes.set(comment.id, node);
    if (comment.parent_id === null) {
      roots.push(node);
    } else {
      nodes.get(comment.parent_id)?.replies.push(node);
    }
  }
  return roots;
}

interface MutableNode extends CommentPageNode {
  readonly replies: MutableNode[];
}
