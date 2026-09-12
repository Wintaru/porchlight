import { createAnonymousComment } from "@/app/anonymous-comment-actions";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import styles from "./comments.module.css";

interface AnonymousCommentFormProps {
  readonly postId: string;
  readonly returnTo: string;
}

// The comment box for a visitor (SPEC.md §4): root comments only, no sign-in, guarded
// by Turnstile the same way the anonymous post form is. Nothing shows until an admin
// approves it.
export function AnonymousCommentForm({ postId, returnTo }: AnonymousCommentFormProps) {
  return (
    <form
      action={createAnonymousComment}
      className={styles.form}
      data-testid="anonymous-comment-form"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <textarea
        name="bodyMd"
        aria-label="Your comment"
        className={styles.textarea}
        placeholder="Say something kind or useful…"
        required
      />
      <TurnstileWidget />
      <div className={styles.formRow}>
        <button type="submit" className={styles.button}>
          Comment anonymously
        </button>
      </div>
    </form>
  );
}
