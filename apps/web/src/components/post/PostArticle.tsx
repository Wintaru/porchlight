import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/comments/ReactionBar";
import { TagChips } from "@/components/PostCardList";
import { RaccoonMark } from "@/components/RaccoonMark";
import { ShareButton } from "@/components/ShareButton";
import { formatDate } from "@/lib/format-date";
import { readingMinutes } from "@/lib/reading-time";
import { reportPathFor } from "@/lib/report-link";
import type { PostPage } from "@/read-model/post-page";
import type { ItemReactions } from "@/read-model/reactions";

import styles from "./post.module.css";

interface PostArticleProps {
  readonly post: PostPage;
  // A status line only the author or staff see: waiting, rejected, hidden.
  readonly note: string | undefined;
  // More above the title, when there is more to say (a rejection's reason).
  readonly notices?: ReactNode;
  readonly shareUrl: string;
  readonly reactions: ItemReactions;
  readonly viewerId: string | undefined;
  readonly returnTo: string;
}

// The Post board's article, the same for a member's post and an anonymous one: tags
// over the title, the byline with Share, the body, the reaction row. The board's cover
// image arrives with #36, which is what first publishes one (and blurs a mature one).
export function PostArticle({
  post,
  note,
  notices,
  shareUrl,
  reactions,
  viewerId,
  returnTo,
}: PostArticleProps) {
  return (
    <article className={styles.article}>
      {note !== undefined && (
        <p role="status" className={styles.note} data-testid="post-status-note">
          {note}
        </p>
      )}
      {notices}
      <header className={styles.head}>
        <TagChips
          tags={post.post_tags}
          linked={post.status === "published" && post.visibility === "public"}
        />
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.byline}>
          <Byline post={post} />
          <div className={styles.bylineActions}>
            <ShareButton url={shareUrl} title={post.title} />
            {/* Anyone may report a published post (SPEC.md §7), except its author. */}
            {post.status === "published" && viewerId !== post.author_id && (
              <Link
                className={styles.reportLink}
                href={reportPathFor({ kind: "post", id: post.id }, returnTo)}
                data-testid="post-report"
              >
                Report
              </Link>
            )}
          </div>
        </div>
      </header>
      <div
        className={`prose ${styles.body ?? ""}`}
        data-testid="post-body"
        dangerouslySetInnerHTML={{ __html: post.body_html }}
      />
      {post.status === "published" && (
        <div id="reactions" className={styles.reactions} data-testid="post-reactions">
          <ReactionBar
            target={{ kind: "post", id: post.id }}
            reactions={reactions}
            canReact={viewerId !== undefined}
            returnTo={returnTo}
          />
        </div>
      )}
    </article>
  );
}

function Byline({ post }: { readonly post: PostPage }) {
  const details = [
    post.published_at === null ? undefined : formatDate(post.published_at),
    `${String(readingMinutes(post.body_html))} min read`,
  ].filter((part) => part !== undefined);
  const when = <span className={styles.muted}> · {details.join(" · ")}</span>;
  if (post.author === null) {
    return (
      <div className={styles.author}>
        <RaccoonMark size={36} />
        <p>
          <span className={styles.name} data-testid="anonymous-author">
            Porch raccoon
          </span>{" "}
          <span className="chip chip--warm">anonymous</span>
          {when}
        </p>
      </div>
    );
  }
  return (
    <div className={styles.author}>
      <Avatar
        src={post.author.avatar_url}
        name={post.author.display_name ?? post.author.handle}
        size={36}
      />
      <p>
        <Link href={`/@${post.author.handle}`} className={styles.name}>
          @{post.author.handle}
        </Link>
        {when}
      </p>
    </div>
  );
}
