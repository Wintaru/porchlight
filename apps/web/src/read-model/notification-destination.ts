import type { DbClient, Enums } from "@porchlight/db";

// The notice and its post in one read. RLS leaves `post` null when the member may not
// read that post any more.
const DESTINATION_COLUMNS =
  "kind, post_id, comment_id, post:posts!notifications_post_id_fkey(slug, author_id, author:profiles!posts_author_id_fkey(handle))";

interface NoticeTarget {
  readonly kind: Enums<"notification_kind">;
  readonly post_id: string | null;
  readonly comment_id: string | null;
  readonly post: {
    readonly slug: string;
    readonly author_id: string | null;
    readonly author: { readonly handle: string } | null;
  } | null;
}

// Where a bell item leads (#109), read under the member's own RLS: null when it leads
// nowhere they can open.
export async function notificationDestination(
  db: DbClient,
  viewerId: string,
  notificationId: string,
): Promise<string | null> {
  const { data: notice, error } = await db
    .from("notifications")
    .select(DESTINATION_COLUMNS)
    .eq("id", notificationId)
    .maybeSingle();
  if (error) {
    throw new Error(`notification ${notificationId}: ${error.message}`);
  }
  return notice === null ? null : destinationOf(viewerId, notice);
}

function destinationOf(viewerId: string, notice: NoticeTarget): string | null {
  switch (notice.kind) {
    case "queue.pending":
      return "/mod/queue";
    case "report.filed":
      return "/mod/reports";
    case "reply.created":
    case "item.approved":
    case "item.rejected":
    case "mod.action":
    case "post.published":
      return postDestination(viewerId, notice);
  }
}

// The author's own post that is not about a comment opens in the editor, which shows
// its status and a rejection's reason. Anything else opens on its page, at the comment.
function postDestination(viewerId: string, notice: NoticeTarget): string | null {
  const { post, post_id: postId, comment_id: commentId } = notice;
  if (post === null || postId === null) {
    return null;
  }
  if (commentId === null && post.author_id === viewerId) {
    return `/write/${postId}`;
  }
  const page =
    post.author === null ? `/p/${post.slug}` : `/@${post.author.handle}/${post.slug}`;
  return commentId === null ? page : `${page}#comment-${commentId}`;
}
