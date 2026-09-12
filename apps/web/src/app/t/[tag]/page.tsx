import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { PostCardList } from "@/components/PostCardList";
import { SITE_NAME } from "@/lib/site";
import { loadTag, loadTagPosts } from "@/read-model/tag";

interface TagPageProps {
  readonly params: Promise<{ readonly tag: string }>;
}

const getTag = cache(async (slug: string) => loadTag(await createSessionClient(), slug));

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = await getTag((await params).tag);
  return tag === undefined ? {} : { title: `${tag.name} · ${SITE_NAME}` };
}

// The tag page, /t/slug: the public posts under one tag, newest first. Unlisted posts
// never appear (SPEC.md §5).
export default async function TagPage({ params }: TagPageProps) {
  const tag = await getTag((await params).tag);
  if (tag === undefined) {
    notFound();
  }
  const posts = await loadTagPosts(await createSessionClient(), tag.id);
  return (
    <main>
      <h1>{tag.name}</h1>
      <PostCardList posts={posts} empty="No posts with this tag yet." />
    </main>
  );
}
