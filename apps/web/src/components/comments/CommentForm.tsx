import { createComment } from "@/app/[handle]/[slug]/actions";
import styles from "./comments.module.css";

interface CommentFormProps {
  readonly postId: string;
  readonly parentId: string | null;
  readonly returnTo: string;
}

// The comment box from the Post board, used for a root comment and, inside a Reply
// disclosure, for an answer. Plain form, Server Function: no script needed to post.
export function CommentForm({ postId, parentId, returnTo }: CommentFormProps) {
  const isReply = parentId !== null;
  return (
    <form
      action={createComment}
      className={styles.form}
      data-testid={isReply ? "reply-form" : "comment-form"}
    >
      <input type="hidden" name="postId" value={postId} />
      {isReply && <input type="hidden" name="parentId" value={parentId} />}
      <input type="hidden" name="returnTo" value={returnTo} />
      <textarea
        name="bodyMd"
        aria-label={isReply ? "Your reply" : "Your comment"}
        className={styles.textarea}
        placeholder={isReply ? "Write a reply…" : "Say something kind or useful…"}
        required
      />
      <div className={styles.formRow}>
        <button type="submit" className={styles.button}>
          {isReply ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}
