import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { CommentSection } from "@/components/comments/CommentSection";
import { ReactionBar } from "@/components/comments/ReactionBar";
import { TagChips } from "@/components/PostCardList";
import { commentFormStateFor } from "@/lib/can-comment";
import { getCurrentActor } from "@/lib/current-actor";
import { formatDate } from "@/lib/format-date";
import { parseHandleParam } from "@/lib/handle-param";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_NAME } from "@/lib/site";
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
  if (post === undefined) {
    return {};
  }
  return {
    title: `${post.title} · ${SITE_NAME}`,
    description: post.summary ?? undefined,
    // Unlisted posts and anything not yet published carry noindex (SPEC.md §5).
    robots:
      post.visibility === "unlisted" || post.status !== "published"
        ? "noindex"
        : undefined,
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

  return (
    <main>
      <article>
        {note !== undefined && (
          <p role="status" data-testid="post-status-note">
            {note}
          </p>
        )}
        <h1>{post.title}</h1>
        <p>
          <Link href={`/@${post.author.handle}`}>@{post.author.handle}</Link>
          {post.published_at !== null && <> · {formatDate(post.published_at)}</>}
        </p>
        <TagChips tags={post.post_tags} />
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
