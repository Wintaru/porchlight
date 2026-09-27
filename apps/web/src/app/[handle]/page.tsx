import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/follow/FollowButton";
import { followTextFor } from "@/components/follow/follow-messages";
import { blockTextFor } from "@/components/member-block/block-messages";
import { MemberBlockButtons } from "@/components/member-block/MemberBlockButtons";
import { PostCardList } from "@/components/PostCardList";
import { SubscribeCard } from "@/components/SubscribeCard";
import { Toast } from "@/components/toast/Toast";
import { getCurrentActor } from "@/lib/current-actor";
import { formatMonthYear } from "@/lib/format-date";
import { parseHandleParam } from "@/lib/handle-param";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import {
  type AuthorComment,
  type AuthorCommentPost,
  loadAuthor,
  loadAuthorComments,
  loadAuthorPosts,
} from "@/read-model/author";
import { loadViewerFollows } from "@/read-model/follows";
import { loadViewerBlocks } from "@/read-model/member-blocks";

import styles from "./profile.module.css";

interface AuthorPageProps {
  readonly params: Promise<{ readonly handle: string }>;
  readonly searchParams: Promise<{
    readonly tab?: string;
    readonly block?: string;
    readonly follow?: string;
    readonly subscribe?: string;
  }>;
}

// Deduped between generateMetadata and the page: one profile read per request.
const getAuthor = cache(async (segment: string) => {
  const handle = parseHandleParam(segment);
  if (handle === undefined) {
    return undefined;
  }
  return loadAuthor(await createSessionClient(), handle);
});

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const [author, { siteName }] = await Promise.all([
    getAuthor((await params).handle),
    getSiteIdentity(),
  ]);
  if (author === undefined) {
    return {};
  }
  const title = `@${author.handle} · ${siteName}`;
  const description = author.bio ?? undefined;
  const url = `${SITE_URL}/@${author.handle}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${url}/feed.xml` },
    },
    openGraph: { title, description, url, siteName },
    twitter: { card: "summary", title, description },
  };
}

// The author page, /@handle (D11, the Profile board). An erased author never reaches
// here: the proxy answers 410 first. A profile the browser roles cannot read
// (suspended, banned, unknown) is a 404. A signed-in member sees Follow (#24), Mute and
// Block (#23) on anyone else's page; this page still lists a muted member's posts, since the
// member came here on purpose. `?tab=` switches Posts/Comments server-side, so both
// tabs are plain links and work with no client JavaScript.
export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const [author, { tab, block, follow, subscribe }, actor] = await Promise.all([
    getAuthor((await params).handle),
    searchParams,
    getCurrentActor(),
  ]);
  if (author?.status !== "active") {
    notFound();
  }
  const activeTab = tab === "comments" ? "comments" : "posts";
  const db = await createSessionClient();
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  const [posts, comments, blocks, follows] = await Promise.all([
    activeTab === "posts" ? loadAuthorPosts(db, author.id) : undefined,
    activeTab === "comments" ? loadAuthorComments(db, author.id) : undefined,
    loadViewerBlocks(db, viewerId),
    loadViewerFollows(db, viewerId),
  ]);
  const blockText = blockTextFor(block);
  const followText = followTextFor(follow);
  const returnTo = `/@${author.handle}`;
  const name = author.display_name ?? `@${author.handle}`;

  return (
    <main className={styles.wrap}>
      {blockText !== undefined && (
        <Toast message={blockText} param="block" testId="block-status" />
      )}
      {followText !== undefined && (
        <Toast message={followText} param="follow" testId="follow-status" />
      )}
      <div className={styles.header}>
        <Avatar src={author.avatar_url} name={name} size={112} />
        <div className={styles.identity}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.handle} data-testid="author-handle">
            @{author.handle}
          </p>
          {author.bio !== null && <p className={styles.bio}>{author.bio}</p>}
          <p className={styles.meta}>
            On the porch since {formatMonthYear(author.created_at)}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="pill-button" href={`/@${author.handle}/feed.xml`}>
            RSS
          </Link>
          {viewerId !== undefined && viewerId !== author.id && (
            <FollowButton
              kind="author"
              target={author.id}
              following={follows.authors.has(author.id)}
              returnTo={returnTo}
            />
          )}
          {viewerId !== undefined && viewerId !== author.id && (
            <MemberBlockButtons
              targetId={author.id}
              handle={author.handle}
              level={blocks.get(author.id)}
              returnTo={returnTo}
            />
          )}
        </div>
      </div>

      <nav className="tabs" aria-label="Profile">
        <Link
          className="tab-link"
          aria-current={activeTab === "posts" ? "page" : undefined}
          href={`/@${author.handle}`}
        >
          Posts
        </Link>
        <Link
          className="tab-link"
          aria-current={activeTab === "comments" ? "page" : undefined}
          href={`/@${author.handle}?tab=comments`}
        >
          Comments
        </Link>
      </nav>

      {activeTab === "posts" ? (
        <PostCardList posts={posts ?? []} empty="No posts yet." variant="row" />
      ) : (
        <AuthorCommentList comments={comments ?? []} />
      )}

      {viewerId !== author.id && (
        <SubscribeCard
          authorId={author.id}
          label={name}
          returnTo={returnTo}
          status={subscribe}
        />
      )}

      <p className={styles.footerNote}>
        No totals, no rankings. Reactions live on the posts, not the person.
      </p>
    </main>
  );
}

function AuthorCommentList({
  comments,
}: {
  readonly comments: readonly AuthorComment[];
}) {
  if (comments.length === 0) {
    return <p className={styles.meta}>No comments yet.</p>;
  }
  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id} className={styles.commentRow}>
          <p className={styles.meta}>
            on <Link href={commentPostHref(comment.post)}>{comment.post.title}</Link>
          </p>
          <div dangerouslySetInnerHTML={{ __html: comment.body_html }} />
        </li>
      ))}
    </ul>
  );
}

function commentPostHref(post: AuthorCommentPost): string {
  return post.author === null
    ? `/p/${post.slug}`
    : `/@${post.author.handle}/${post.slug}`;
}
