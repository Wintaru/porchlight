import Link from "next/link";

import { deleteComment } from "@/app/[handle]/[slug]/actions";
import { Avatar } from "@/components/Avatar";
import { RaccoonMark } from "@/components/RaccoonMark";
import { classNames } from "@/lib/class-names";
import { formatDate } from "@/lib/format-date";
import { reportPathFor } from "@/lib/report-link";
import type { CommentPage, CommentPageNode } from "@/read-model/comments";
import { type ItemReactions, NO_REACTIONS } from "@/read-model/reactions";
import { AnonymousCommentForm } from "./AnonymousCommentForm";
import { CommentForm } from "./CommentForm";
import styles from "./comments.module.css";
import { ReactionBar } from "./ReactionBar";

export interface CommentViewer {
  readonly profileId: string | undefined;
  readonly isAdmin: boolean;
  // Who may reply here, and through which form: a member's or a visitor's (#33).
  readonly replyAs: "member" | "visitor" | null;
}

interface CommentThreadProps {
  readonly nodes: readonly CommentPageNode[];
  readonly postId: string;
  readonly postAuthorId: string | null;
  readonly reactions: ReadonlyMap<string, ItemReactions>;
  readonly viewer: CommentViewer;
  readonly returnTo: string;
}

// The tree, one list per level. Replies indent under their parent; the depth cap keeps
// the indent to six steps (D10). A tombstone keeps its slot and its replies (D5).
export function CommentThread(props: CommentThreadProps) {
  const { nodes } = props;
  if (nodes.length === 0) {
    return null;
  }
  return (
    <ul className={styles.list}>
      {nodes.map((node) => (
        <li key={node.comment.id}>
          <CommentRow {...props} node={node} />
          {node.replies.length > 0 && (
            <div className={styles.replies}>
              <CommentThread {...props} nodes={node.replies} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const STATUS_NOTE: Readonly<Partial<Record<CommentPage["status"], string>>> = {
  pending: "Waiting for approval. Only you can see this.",
  rejected: "Rejected by a moderator. Only you can see this.",
  hidden: "Hidden by a moderator. Only you can see this.",
  removed: "Removed by a moderator. Only you can see this.",
};

function CommentRow({
  node,
  postId,
  postAuthorId,
  reactions,
  viewer,
  returnTo,
}: CommentThreadProps & { readonly node: CommentPageNode }) {
  const { comment } = node;
  const anchor = `comment-${comment.id}`;
  if (comment.status === "tombstone") {
    return (
      <article
        id={anchor}
        className={styles.comment}
        data-testid="comment-tombstone"
        data-depth={comment.depth}
      >
        <span className={classNames("avatar", styles.emptyAvatar)} aria-hidden="true" />
        <div className={styles.main}>
          <p className={styles.meta}>
            <span className={classNames(styles.handle, styles.tombstone)}>[deleted]</span>
            <span>· {formatDate(comment.created_at)}</span>
          </p>
          <p className={classNames(styles.body, styles.tombstone)}>
            This comment was erased by its author.
          </p>
        </div>
      </article>
    );
  }
  const isOwn = comment.author_id !== null && comment.author_id === viewer.profileId;
  const mayDelete = isOwn || viewer.isAdmin;
  const note = STATUS_NOTE[comment.status];
  return (
    <article
      id={anchor}
      className={styles.comment}
      data-testid="comment"
      data-depth={comment.depth}
      data-status={comment.status}
    >
      <CommentFace comment={comment} />
      <div className={styles.main}>
        <p className={styles.meta}>
          <CommentAuthor comment={comment} postAuthorId={postAuthorId} />
          <span>· {formatDate(comment.created_at)}</span>
        </p>
        <div
          className={styles.body}
          data-testid="comment-body"
          dangerouslySetInnerHTML={{ __html: comment.body_html }}
        />
        {note !== undefined && (
          <p role="status" className={styles.status} data-testid="comment-status">
            {note}
          </p>
        )}
        <div className={styles.actions}>
          {comment.status === "visible" && (
            <ReactionBar
              target={{ kind: "comment", id: comment.id }}
              reactions={reactions.get(comment.id) ?? NO_REACTIONS}
              canReact={viewer.profileId !== undefined}
              returnTo={returnTo}
            />
          )}
          {/* Anyone may report a visible comment but its author (SPEC.md §7). */}
          {comment.status === "visible" && !isOwn && (
            <Link
              className={styles.quietButton}
              href={reportPathFor(
                { kind: "comment", id: comment.id },
                `${returnTo}#${anchor}`,
              )}
              data-testid="comment-report"
            >
              Report
            </Link>
          )}
          {mayDelete && (
            <form action={deleteComment}>
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={styles.quietButton}>
                Delete
              </button>
            </form>
          )}
        </div>
        {viewer.replyAs !== null && comment.status === "visible" && (
          <details className={styles.reply}>
            <summary>Reply</summary>
            {viewer.replyAs === "member" ? (
              <CommentForm postId={postId} parentId={comment.id} returnTo={returnTo} />
            ) : (
              <AnonymousCommentForm
                postId={postId}
                parentId={comment.id}
                returnTo={returnTo}
              />
            )}
          </details>
        )}
      </div>
    </article>
  );
}

// Who wrote it. The raccoon is only for a comment with no profile at all (#8). A
// member whose profile the browser roles cannot read (suspended, banned) still wrote
// it, so their comment is never shown as anonymous; it shows with no handle instead.
function CommentAuthor({
  comment,
  postAuthorId,
}: {
  readonly comment: CommentPage;
  readonly postAuthorId: string | null;
}) {
  if (comment.anonymous_author_id !== null) {
    return (
      <>
        <span className={styles.handle}>Porch raccoon</span>
        <span className="chip chip--warm">anonymous</span>
      </>
    );
  }
  if (comment.author === null) {
    return <span className={styles.handle}>[unavailable]</span>;
  }
  return (
    <>
      <Link href={`/@${comment.author.handle}`} className={styles.handle}>
        @{comment.author.handle}
      </Link>
      {comment.author_id === postAuthorId && (
        <span className="chip chip--warm">author</span>
      )}
    </>
  );
}

// The face beside a comment: the raccoon for an anonymous one, a member's avatar, and
// an empty circle for a member whose profile the browser cannot read.
function CommentFace({ comment }: { readonly comment: CommentPage }) {
  if (comment.anonymous_author_id !== null) {
    return <RaccoonMark size={32} />;
  }
  if (comment.author === null) {
    return (
      <span className={classNames("avatar", styles.emptyAvatar)} aria-hidden="true" />
    );
  }
  return (
    <Avatar
      src={comment.author.avatar_url}
      name={comment.author.display_name ?? comment.author.handle}
      size={32}
    />
  );
}
