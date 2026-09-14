import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { PostCardList } from "@/components/PostCardList";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadTag, loadTagPosts } from "@/read-model/tag";

interface TagPageProps {
  readonly params: Promise<{ readonly tag: string }>;
}

const getTag = cache(async (slug: string) => loadTag(await createSessionClient(), slug));

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const [tag, { siteName }] = await Promise.all([
    getTag((await params).tag),
    getSiteIdentity(),
  ]);
  if (tag === undefined) {
    return {};
  }
  const title = `${tag.name} · ${siteName}`;
  const url = `${SITE_URL}/t/${tag.slug}`;
  return {
    title,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${url}/feed.xml` },
    },
    openGraph: { title, url, siteName },
    twitter: { card: "summary", title },
  };
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
    <main
      className="container"
      style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>{tag.name}</h1>
      <PostCardList posts={posts} empty="No posts with this tag yet." />
    </main>
  );
}
