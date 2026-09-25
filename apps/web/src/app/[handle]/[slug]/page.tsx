import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { CommentSection } from "@/components/comments/CommentSection";
import { PostArticle } from "@/components/post/PostArticle";
import postStyles from "@/components/post/post.module.css";
import { commentFormStateFor } from "@/lib/can-comment";
import { getAgentDisclosure } from "@/lib/agent-disclosure";
import { getCurrentActor } from "@/lib/current-actor";
import { parseHandleParam } from "@/lib/handle-param";
import { publicMediaUrl } from "@/lib/media-url";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
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
  const [post, { siteName }] = await Promise.all([
    getPost(handle, slug),
    getSiteIdentity(),
  ]);
  if (post?.author == null) {
    return {};
  }
  const url = `${SITE_URL}/@${post.author.handle}/${post.slug}`;
  const description = post.summary ?? undefined;
  // Unlisted posts and anything not yet published carry noindex (SPEC.md §5, §9).
  const noindex = post.visibility === "unlisted" || post.status !== "published";
  return {
    title: `${post.title} · ${siteName}`,
    description,
    robots: noindex ? "noindex" : undefined,
    alternates: noindex ? undefined : { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      siteName,
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
// (D20). The article itself is PostArticle, built to the Post board (#47).
export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { handle, slug } = await params;
  const post = await getPost(handle, slug);
  if (post?.author == null) {
    notFound();
  }
  const note = STATUS_NOTE[post.status];
  const returnTo = `/@${post.author.handle}/${post.slug}`;

  const [actor, db, { comment: noticeCode, error: errorCode }, { siteName }, disclosure] =
    await Promise.all([
      getCurrentActor(),
      createSessionClient(),
      searchParams,
      getSiteIdentity(),
      // Only an agent's post has a line to show, so only it pays for the read.
      post.origin === "agent" ? getAgentDisclosure() : ("off" as const),
    ]);
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  const [formState, comments, reactions] = await Promise.all([
    commentFormStateFor(actor, post.id),
    loadCommentsForPost(db, post.id),
    loadReactionsForPost(db, post.id, viewerId),
  ]);

  const url = `${SITE_URL}${returnTo}`;

  return (
    <main className={postStyles.page}>
      {post.status === "published" && post.visibility === "public" && (
        // JSON-LD Article (SPEC.md §9): only for what a crawler is meant to index.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd(post, url, siteName)),
          }}
        />
      )}
      <PostArticle
        post={post}
        note={note}
        notices={
          post.status === "rejected" &&
          post.rejection_reason !== null && (
            <p className={postStyles.note} data-testid="post-rejection-reason">
              Reason: {post.rejection_reason}
            </p>
          )
        }
        shareUrl={url}
        reactions={reactions.post}
        viewerId={viewerId}
        disclosure={disclosure}
        returnTo={returnTo}
      />
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
function articleJsonLd(
  post: PostPage,
  url: string,
  siteName: string,
): Record<string, unknown> {
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
    publisher: { "@type": "Organization", name: siteName },
  };
}
