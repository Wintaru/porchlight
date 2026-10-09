import type { AgentDisclosure } from "@porchlight/core";
import { carriesMatureTag } from "@porchlight/core/client";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/comments/ReactionBar";
import { TagChips } from "@/components/PostCardList";
import { PrivateChip } from "@/components/PrivateChip";
import { RaccoonMark } from "@/components/RaccoonMark";
import { RevealImage } from "@/components/RevealImage";
import { ShareButton } from "@/components/ShareButton";
import { publishPost, unpublishPost } from "@/app/write/actions";
import { formatDate } from "@/lib/format-date";
import { shownCover } from "@/lib/post-cover";
import { readingMinutes } from "@/lib/reading-time";
import { reportPathFor } from "@/lib/report-link";
import type { PostPage } from "@/read-model/post-page";
import type { ItemReactions } from "@/read-model/reactions";

import { AuthorMenu } from "./AuthorMenu";
import { MatureReveal } from "./MatureReveal";
import { ProseHtml } from "./ProseHtml";
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
  // `site_config.agent_disclosure` (SPEC.md §17).
  readonly disclosure: AgentDisclosure;
}

// The Post board's article, the same for a member's post and an anonymous one: tags
// over the title, the byline with Share, the cover, the body, the reaction row. A cover
// shows only once it has a published copy (#36), blurred behind a click when mature;
// a post with the mature tag is blurred whole, cover and body, behind one click (#117).
export function PostArticle({
  post,
  note,
  notices,
  shareUrl,
  reactions,
  viewerId,
  returnTo,
  disclosure,
}: PostArticleProps) {
  const agentLine = disclosure === "footer" ? agentLineFor(post) : undefined;
  // Only its author ever reaches a private post (D27): nothing to share, react to or
  // report, since nobody else can open it.
  const isPrivate = post.visibility === "private";
  // A link to an unpublished post is a 404 for everyone but its author.
  const isShareable = post.status === "published" && !isPrivate;
  return (
    <article className={styles.article}>
      {note !== undefined && (
        <p role="status" className={styles.statusNote} data-testid="post-status-note">
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
            {viewerId !== undefined && viewerId === post.author_id && (
              <AuthorControls post={post} returnTo={returnTo} />
            )}
            {isShareable && <ShareButton url={shareUrl} title={post.title} />}
            {/* Anyone may report a published post (SPEC.md §7), except its author. */}
            {post.status === "published" && !isPrivate && viewerId !== post.author_id && (
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
      {carriesMatureTag(post.post_tags) ? (
        // One click reveals the whole post, so its cover needs no click of its own.
        <MatureReveal id={post.id}>
          <Cover post={post} insideReveal />
          <Body post={post} />
        </MatureReveal>
      ) : (
        <>
          <Cover post={post} insideReveal={false} />
          <Body post={post} />
        </>
      )}
      {agentLine !== undefined && (
        <p className={styles.disclosure} data-testid="agent-disclosure">
          {agentLine}
        </p>
      )}
      {post.status === "published" && !isPrivate && (
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

// Publish for a draft, Edit, and a menu for Unpublish and Delete, for the post's own
// author only (#72). The page decides who that is from the session, and each action
// checks ownership again. The menu is a <details>, so it opens with no JavaScript.
// Delete goes to its confirm page, which sends Cancel back here.
function AuthorControls({
  post,
  returnTo,
}: {
  readonly post: PostPage;
  readonly returnTo: string;
}) {
  const canUnpublish = post.status === "published" || post.status === "pending";
  return (
    <>
      {post.status === "draft" && (
        <form action={publishPost}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="pill-button pill-button--amber"
            data-testid="post-publish"
          >
            Publish
          </button>
        </form>
      )}
      <Link
        href={`/write/${post.id}`}
        className={styles.authorLink}
        data-testid="post-edit"
      >
        Edit
      </Link>
      <AuthorMenu>
        {canUnpublish && (
          <form action={unpublishPost}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit">Unpublish</button>
          </form>
        )}
        <Link href={`/write/${post.id}/history`}>History</Link>
        <Link
          href={`/write/${post.id}/delete?from=${encodeURIComponent(returnTo)}`}
          className={styles.dangerItem}
        >
          Delete
        </Link>
      </AuthorMenu>
    </>
  );
}

// The disclosure line under a post an agent drafted (SPEC.md §17): edited once a person
// has saved or published it, posted by the assistant when nobody has. A published post
// an agent changed says so until its author saves it (D32), whoever drafted it.
function agentLineFor(post: PostPage): string | undefined {
  if (post.author === null) {
    return undefined;
  }
  const handle = `@${post.author.handle}`;
  if (post.agent_edited_at !== null) {
    return `Last changed by an assistant for ${handle}`;
  }
  if (post.origin !== "agent") {
    return undefined;
  }
  return post.reviewed_at === null
    ? `Posted by an assistant for ${handle}`
    : `Drafted with an assistant, edited by ${handle}`;
}

function Cover({
  post,
  insideReveal,
}: {
  readonly post: PostPage;
  readonly insideReveal: boolean;
}) {
  const cover = shownCover(post);
  if (cover === undefined) {
    return null;
  }
  const { src } = cover;
  return (
    <figure className={styles.cover} data-testid="post-cover">
      {cover.mature && !insideReveal ? (
        <RevealImage id={post.id} src={src} alt="" mode="mature" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image
        <img src={src} alt="" />
      )}
    </figure>
  );
}

function Body({ post }: { readonly post: PostPage }) {
  return (
    <ProseHtml
      html={post.body_html}
      className={`prose ${styles.body ?? ""}`}
      testId="post-body"
    />
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
        </Link>{" "}
        {post.visibility === "private" && <PrivateChip />}
        {when}
      </p>
    </div>
  );
}
