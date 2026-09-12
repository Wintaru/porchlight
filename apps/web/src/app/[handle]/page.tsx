import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { PostCardList } from "@/components/PostCardList";
import { parseHandleParam } from "@/lib/handle-param";
import { SITE_NAME } from "@/lib/site";
import { loadAuthor, loadAuthorPosts } from "@/read-model/author";

interface AuthorPageProps {
  readonly params: Promise<{ readonly handle: string }>;
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
  const author = await getAuthor((await params).handle);
  if (author === undefined) {
    return {};
  }
  return {
    title: `@${author.handle} · ${SITE_NAME}`,
    description: author.bio ?? undefined,
  };
}

// The author page, /@handle (D11). An erased author never reaches here: the proxy
// answers 410 first. A profile the browser roles cannot read (suspended, banned,
// unknown) is a 404. The full Profile board is #16.
export default async function AuthorPage({ params }: AuthorPageProps) {
  const author = await getAuthor((await params).handle);
  if (author?.status !== "active") {
    notFound();
  }
  const posts = await loadAuthorPosts(await createSessionClient(), author.id);
  return (
    <main>
      <h1>{author.display_name ?? `@${author.handle}`}</h1>
      <p data-testid="author-handle">@{author.handle}</p>
      {author.bio !== null && <p>{author.bio}</p>}
      <h2>Posts</h2>
      <PostCardList posts={posts} empty="No posts yet." />
    </main>
  );
}
