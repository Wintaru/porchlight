import Link from "next/link";

import {
  commentErrorTextFor,
  commentNoticeTextFor,
} from "@/app/[handle]/[slug]/comment-messages";
import type { CommentFormState } from "@/lib/can-comment";
import type { CommentPageNode } from "@/read-model/comments";
import type { ItemReactions } from "@/read-model/reactions";
import { AnonymousCommentForm } from "./AnonymousCommentForm";
import { CommentForm } from "./CommentForm";
import styles from "./comments.module.css";
import { CommentThread, type CommentViewer } from "./CommentThread";

interface CommentSectionProps {
  readonly postId: string;
  readonly postAuthorId: string | null;
  readonly comments: readonly CommentPageNode[];
  readonly reactions: ReadonlyMap<string, ItemReactions>;
  readonly formState: CommentFormState;
  readonly viewer: Omit<CommentViewer, "canComment">;
  readonly signInPath: string;
  readonly returnTo: string;
  readonly noticeCode: string | undefined;
  readonly errorCode: string | undefined;
}

// The comments block of the Post board: the count, the form (or the reason there is
// none), then the tree. The form hides when the post's switch is off or the site's
// `comments` key says so; existing comments stay (D20).
export function CommentSection({
  postId,
  postAuthorId,
  comments,
  reactions,
  formState,
  viewer,
  signInPath,
  returnTo,
  noticeCode,
  errorCode,
}: CommentSectionProps) {
  const count = countLive(comments);
  const notice = commentNoticeTextFor(noticeCode);
  const error = commentErrorTextFor(errorCode);
  return (
    <section id="comments" className={styles.section} aria-labelledby="comments-heading">
      <h2 id="comments-heading" className={styles.heading} data-testid="comment-count">
        {count === 1 ? "1 comment" : `${String(count)} comments`}
      </h2>
      {notice !== undefined && (
        <p role="status" className={styles.notice} data-testid="comment-notice">
          {notice}
        </p>
      )}
      {error !== undefined && (
        <p role="alert" className={styles.error} data-testid="comment-error">
          {error}
        </p>
      )}
      {formState === "open" && (
        <CommentForm postId={postId} parentId={null} returnTo={returnTo} />
      )}
      {formState === "anonymous" && (
        <AnonymousCommentForm postId={postId} returnTo={returnTo} />
      )}
      {formState === "signed-out" && (
        <p className={styles.notice} data-testid="comment-sign-in">
          <Link href={signInPath}>Sign in</Link> to comment.
        </p>
      )}
      <CommentThread
        nodes={comments}
        postId={postId}
        postAuthorId={postAuthorId}
        reactions={reactions}
        viewer={{ ...viewer, canComment: formState === "open" }}
        returnTo={returnTo}
      />
    </section>
  );
}

// Tombstones hold a place but are not comments anyone made.
function countLive(nodes: readonly CommentPageNode[]): number {
  return nodes.reduce(
    (sum, node) =>
      sum + (node.comment.status === "tombstone" ? 0 : 1) + countLive(node.replies),
    0,
  );
}
