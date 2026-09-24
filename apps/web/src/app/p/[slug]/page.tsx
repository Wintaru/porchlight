import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { CommentSection } from "@/components/comments/CommentSection";
import { PostArticle } from "@/components/post/PostArticle";
import postStyles from "@/components/post/post.module.css";
import { commentFormStateFor } from "@/lib/can-comment";
import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadCommentsForPost } from "@/read-model/comments";
import { loadPostBySlug, type PostPage } from "@/read-model/post-page";
import { loadReactionsForPost } from "@/read-model/reactions";

interface AnonymousPostPageProps {
  readonly params: Promise<{ readonly slug: string }>;
  readonly searchParams: Promise<{ readonly comment?: string; readonly error?: string }>;
}

const getPost = cache(async (slug: string) =>
  loadPostBySlug(await createSessionClient(), slug),
);

export async function generateMetadata({
  params,
}: AnonymousPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, { siteName }] = await Promise.all([getPost(slug), getSiteIdentity()]);
  if (post === undefined) {
    return {};
  }
  return {
    title: `${post.title} · ${siteName}`,
    description: post.summary ?? undefined,
    robots:
      post.visibility === "unlisted" || post.status !== "published"
        ? "noindex"
        : undefined,
  };
}

const STATUS_NOTE: Readonly<Partial<Record<PostPage["status"], string>>> = {
  pending: "Waiting for approval.",
  rejected: "Rejected by a moderator.",
  hidden: "Hidden by a moderator.",
  removed: "Removed by a moderator.",
};

// D11's anonymous route: `/p/slug`. `proxy.ts` already sends a claimed post's own
// author on to `/@handle/slug` with a 301; anyone still landing here sees the post
// itself. Nothing anonymous is visible under RLS before an admin approves it (SPEC.md
// §4), so an unapproved post's own author sees the same 404 everyone else does — the
// status page (`/anon`) is where they check on it instead.
export default async function AnonymousPostPage({
  params,
  searchParams,
}: AnonymousPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (post?.author !== null) {
    notFound();
  }
  const note = STATUS_NOTE[post.status];
  const returnTo = `/p/${post.slug}`;

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

  return (
    <main className={postStyles.page}>
      <PostArticle
        post={post}
        note={note}
        shareUrl={`${SITE_URL}${returnTo}`}
        reactions={reactions.post}
        viewerId={viewerId}
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
