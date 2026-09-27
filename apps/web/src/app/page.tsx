import type { Metadata } from "next";
import Link from "next/link";

import { PostCardList } from "@/components/PostCardList";
import { HomeSidebar } from "@/components/HomeSidebar";
import { createSessionClient } from "@/auth/session-client";
import { canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadFeedFor } from "@/read-model/feed";
import { loadFollowingFeed, loadPublishedAuthorCount } from "@/read-model/follows";
import { loadTagCloud } from "@/read-model/tag";

import styles from "./home.module.css";

interface HomePageProps {
  readonly searchParams: Promise<{ readonly erased?: string; readonly feed?: string }>;
}

// SPEC.md §9: the site feed's `<link rel="alternate">` and the home page's own OG
// card, so a link to the site itself unfurls with a title and a tagline.
export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteTagline } = await getSiteIdentity();
  return {
    title: siteName,
    description: siteTagline,
    alternates: {
      canonical: SITE_URL,
      types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
    },
    openGraph: {
      title: siteName,
      description: siteTagline,
      url: SITE_URL,
      siteName,
    },
    twitter: { card: "summary", title: siteName, description: siteTagline },
  };
}

// The home feed, the Main board (SPEC.md §5): every public published post, newest
// first. Read through the read-model with the session client, so RLS is the wall (D2).
// `erased=1` is where EraseAccountHandler's confirm form lands once the member's own
// session is gone (SPEC.md §10): nowhere under `/settings` can show this, since that
// gate now redirects to sign-in.
export default async function HomePage({ searchParams }: HomePageProps) {
  const [{ siteName, siteTagline }, actor, { erased, feed }] = await Promise.all([
    getSiteIdentity(),
    getCurrentActor(),
    searchParams,
  ]);
  const db = await createSessionClient();
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  // The Following tab (#24, D20) is a member's, and only on a site with two or more
  // authors: with one, it would be the same list as Everything.
  const authorCount = viewerId === undefined ? 0 : await loadPublishedAuthorCount(db);
  const showTabs = authorCount >= 2;
  const following = showTabs && feed === "following";
  const [posts, tags, mayWriteAnonymously] = await Promise.all([
    following ? loadFollowingFeed(db) : loadFeedFor(db, viewerId),
    loadTagCloud(db),
    canPostAnonymously(actor),
  ]);
  return (
    <main>
      {erased !== undefined && (
        <p role="status" data-testid="account-erased">
          Your account has been erased.
        </p>
      )}
      <div className={styles.grid}>
        <div>
          <h1>{siteName}</h1>
          <p className={styles.tagline}>{siteTagline}</p>
          <h2 className={styles.heading}>Latest on the porch</h2>
          <p className={styles.subheading}>Newest first · no votes, no rankings</p>
          {showTabs && (
            <nav className="tabs" aria-label="Feed">
              <Link
                className="tab-link"
                aria-current={following ? undefined : "page"}
                href="/"
              >
                Everything
              </Link>
              <Link
                className="tab-link"
                aria-current={following ? "page" : undefined}
                href="/?feed=following"
              >
                Following
              </Link>
            </nav>
          )}
          <PostCardList
            posts={posts}
            empty={
              following
                ? "Nothing yet from the people and tags you follow. Follow someone from their page."
                : "Nothing on the porch yet."
            }
          />
        </div>
        <HomeSidebar
          actor={actor}
          mayWriteAnonymously={mayWriteAnonymously}
          tags={tags}
        />
      </div>
    </main>
  );
}
