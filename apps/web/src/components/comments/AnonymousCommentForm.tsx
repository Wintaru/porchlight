import { createAnonymousComment } from "@/app/anonymous-comment-actions";
import { TurnstileOnOpen } from "@/components/TurnstileOnOpen";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import styles from "./comments.module.css";

interface AnonymousCommentFormProps {
  readonly postId: string;
  // The comment this answers; null for a root comment.
  readonly parentId: string | null;
  readonly returnTo: string;
}

// The comment box for a visitor (SPEC.md §4): a root comment or a reply (#33), no
// sign-in, guarded by Turnstile the same way the anonymous post form is. Nothing shows
// until an admin approves it. A reply form sits in a closed disclosure, so its widget
// waits for the disclosure to open.
export function AnonymousCommentForm({
  postId,
  parentId,
  returnTo,
}: AnonymousCommentFormProps) {
  const isReply = parentId !== null;
  return (
    <form
      action={createAnonymousComment}
      className={styles.form}
      data-testid={isReply ? "anonymous-reply-form" : "anonymous-comment-form"}
    >
      <input type="hidden" name="postId" value={postId} />
      {isReply && <input type="hidden" name="parentId" value={parentId} />}
      <input type="hidden" name="returnTo" value={returnTo} />
      <textarea
        name="bodyMd"
        aria-label={isReply ? "Your reply" : "Your comment"}
        className={styles.textarea}
        placeholder="Say something kind or useful…"
        required
      />
      {isReply ? <TurnstileOnOpen /> : <TurnstileWidget />}
      <div className={styles.formRow}>
        <button type="submit" className={styles.button}>
          {isReply ? "Reply anonymously" : "Comment anonymously"}
        </button>
      </div>
    </form>
  );
}
