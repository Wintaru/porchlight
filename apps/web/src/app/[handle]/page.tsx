import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { Avatar } from "@/components/Avatar";
import { PostCardList } from "@/components/PostCardList";
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

import styles from "./profile.module.css";

interface AuthorPageProps {
  readonly params: Promise<{ readonly handle: string }>;
  readonly searchParams: Promise<{ readonly tab?: string }>;
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
// (suspended, banned, unknown) is a 404. Mute stays off this page entirely — it is a
// phase 2 feature (SPEC.md §14) with nothing behind it yet, so no button, not even a
// disabled one. `?tab=` switches Posts/Comments server-side, so both tabs are plain
// links and work with no client JavaScript.
export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const [author, { tab }] = await Promise.all([
    getAuthor((await params).handle),
    searchParams,
  ]);
  if (author?.status !== "active") {
    notFound();
  }
  const activeTab = tab === "comments" ? "comments" : "posts";
  const db = await createSessionClient();
  const [posts, comments] = await Promise.all([
    activeTab === "posts" ? loadAuthorPosts(db, author.id) : undefined,
    activeTab === "comments" ? loadAuthorComments(db, author.id) : undefined,
  ]);
  const name = author.display_name ?? `@${author.handle}`;

  return (
    <main className={styles.wrap}>
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
