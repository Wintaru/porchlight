import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { FollowButton } from "@/components/follow/FollowButton";
import { followTextFor } from "@/components/follow/follow-messages";
import { PostCardList } from "@/components/PostCardList";
import { Toast } from "@/components/toast/Toast";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { getCurrentActor } from "@/lib/current-actor";
import { loadViewerFollows } from "@/read-model/follows";
import { loadViewerBlocks } from "@/read-model/member-blocks";
import { loadTag, loadTagPosts } from "@/read-model/tag";

import styles from "./tag.module.css";

interface TagPageProps {
  readonly params: Promise<{ readonly tag: string }>;
  readonly searchParams: Promise<{ readonly follow?: string }>;
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
// never appear (SPEC.md §5), and neither do the viewer's muted and blocked members'
// posts (#23). A signed-in member can follow the tag (#24).
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const tag = await getTag((await params).tag);
  if (tag === undefined) {
    notFound();
  }
  const [db, actor, { follow }] = await Promise.all([
    createSessionClient(),
    getCurrentActor(),
    searchParams,
  ]);
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  const [blocks, follows] = await Promise.all([
    loadViewerBlocks(db, viewerId),
    loadViewerFollows(db, viewerId),
  ]);
  const posts = await loadTagPosts(db, tag.id, blocks.keys());
  const followText = followTextFor(follow);
  return (
    <main
      className="container"
      style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 64 }}
    >
      {followText !== undefined && (
        <Toast message={followText} param="follow" testId="follow-status" />
      )}
      <div className={styles.head}>
        <h1>{tag.name}</h1>
        {viewerId !== undefined && (
          <FollowButton
            kind="tag"
            target={tag.slug}
            following={follows.tags.has(tag.slug)}
            returnTo={`/t/${tag.slug}`}
          />
        )}
      </div>
      <PostCardList posts={posts} empty="No posts with this tag yet." />
    </main>
  );
}
