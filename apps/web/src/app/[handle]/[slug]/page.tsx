import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { CommentSection } from "@/components/comments/CommentSection";
import { ReactionBar } from "@/components/comments/ReactionBar";
import { TagChips } from "@/components/PostCardList";
import { ShareButton } from "@/components/ShareButton";
import { commentFormStateFor } from "@/lib/can-comment";
import { getCurrentActor } from "@/lib/current-actor";
import { formatDate } from "@/lib/format-date";
import { parseHandleParam } from "@/lib/handle-param";
import { publicMediaUrl } from "@/lib/media-url";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { loadCommentsForPost } from "@/read-model/comments";
import { loadPostPage, type PostPage } from "@/read-model/post-page";
import { loadReactionsForPost } from "@/read-model/reactions";

interface PostPageProps {
  readonly params: Promise<{ readonly handle: string; readonly slug: string }>;
  readonly searchParams: Promise<{ readonly comment?: string; readonly error?: string }>;
}

const getPost = cache(async (segment: string, slug: string) => {
  const handle = parseHandleParam(segment);
  if (handle === undefined) {
    return undefined;
  }
  return loadPostPage(await createSessionClient(), handle, slug);
});

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const post = await getPost(handle, slug);
  if (post?.author == null) {
    return {};
  }
  const url = `${SITE_URL}/@${post.author.handle}/${post.slug}`;
  const description = post.summary ?? undefined;
  // Unlisted posts and anything not yet published carry noindex (SPEC.md §5, §9).
  const noindex = post.visibility === "unlisted" || post.status !== "published";
  return {
    title: `${post.title} · ${SITE_NAME}`,
    description,
    robots: noindex ? "noindex" : undefined,
    alternates: noindex ? undefined : { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.published_at ?? undefined,
    },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

const STATUS_NOTE: Readonly<Partial<Record<PostPage["status"], string>>> = {
  draft: "Draft. Only you can see this page.",
  pending: "Waiting for approval. Only you can see this page.",
  rejected: "Rejected by a moderator. Only you can see this page.",
  hidden: "Hidden by a moderator. Only you can see this page.",
  removed: "Removed by a moderator. Only you can see this page.",
};

// The post page, /@handle/slug (D11). `body_html` is the sanitized render the
// ContentRenderEngine cached on save (D3): nothing else writes that column, so the
// page inserts it as HTML. Comments and reactions read under RLS through the
// read-model; the form shows only when the CommentManager says this actor may comment
// (D20). The full Post board is #16.
export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { handle, slug } = await params;
  const post = await getPost(handle, slug);
  if (post?.author == null) {
    notFound();
  }
  const note = STATUS_NOTE[post.status];
  const returnTo = `/@${post.author.handle}/${post.slug}`;

  const [actor, db, { comment: noticeCode, error: errorCode }] = await Promise.all([
    getCurrentActor(),
    createSessionClient(),
    searchParams,
  ]);
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  const [formState, comments, reactions] = await Promise.all([
    commentFormStateFor(actor, post.id),
    loadCommentsForPost(db, post.id),
    loadReactionsForPost(db, post.id, viewerId),
  ]);

  const url = `${SITE_URL}${returnTo}`;

  return (
    <main>
      {post.status === "published" && post.visibility === "public" && (
        // JSON-LD Article (SPEC.md §9): only for what a crawler is meant to index.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd(post, url)),
          }}
        />
      )}
      <article>
        {note !== undefined && (
          <p role="status" data-testid="post-status-note">
            {note}
          </p>
        )}
        {post.status === "rejected" && post.rejection_reason !== null && (
          <p data-testid="post-rejection-reason">Reason: {post.rejection_reason}</p>
        )}
        <h1>{post.title}</h1>
        <p>
          <Link href={`/@${post.author.handle}`}>@{post.author.handle}</Link>
          {post.published_at !== null && <> · {formatDate(post.published_at)}</>}
        </p>
        <TagChips tags={post.post_tags} />
        <ShareButton url={url} title={post.title} />
        <div
          data-testid="post-body"
          dangerouslySetInnerHTML={{ __html: post.body_html }}
        />
        {post.status === "published" && (
          <div id="reactions" data-testid="post-reactions">
            <ReactionBar
              target={{ kind: "post", id: post.id }}
              reactions={reactions.post}
              canReact={viewerId !== undefined}
              returnTo={returnTo}
            />
          </div>
        )}
      </article>
      <CommentSection
        postId={post.id}
        postAuthorId={post.author_id}
        comments={comments}
        reactions={reactions.comments}
        formState={formState}
        viewer={{
          profileId: viewerId,
          isAdmin: actor.kind === "member" && actor.profile.role === "admin",
        }}
        signInPath={signInPathFor(returnTo)}
        returnTo={returnTo}
        noticeCode={noticeCode}
        errorCode={errorCode}
      />
    </main>
  );
}

// SPEC.md §9's JSON-LD `Article`, one flavor for every post. `image` is the post's own
// cover (SPEC.md §7) once one is publicly servable (#36) — never the branded card
// `opengraph-image.tsx` falls back to, which is not this post's own artwork, and never
// a mature cover, which D18 always keeps out of an unfurl.
function articleJsonLd(post: PostPage, url: string): Record<string, unknown> {
  const cover = post.cover;
  const coverPath = cover != null && !cover.mature ? cover.published_path : null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    url,
    ...(post.summary !== null && { description: post.summary }),
    ...(post.published_at !== null && { datePublished: post.published_at }),
    ...(coverPath != null && { image: publicMediaUrl(coverPath) }),
    ...(post.author !== null && {
      author: { "@type": "Person", name: post.author.display_name ?? post.author.handle },
    }),
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}
