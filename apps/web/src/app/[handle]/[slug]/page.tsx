import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { TagChips } from "@/components/PostCardList";
import { formatDate } from "@/lib/format-date";
import { parseHandleParam } from "@/lib/handle-param";
import { SITE_NAME } from "@/lib/site";
import { loadPostPage, type PostPage } from "@/read-model/post-page";

interface PostPageProps {
  readonly params: Promise<{ readonly handle: string; readonly slug: string }>;
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
// page inserts it as HTML. The full Post board is #16, comments are #7.
export default async function PostPage({ params }: PostPageProps) {
  const { handle, slug } = await params;
  const post = await getPost(handle, slug);
  if (post?.author == null) {
    notFound();
  }
  const note = STATUS_NOTE[post.status];
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
      </article>
    </main>
  );
}
