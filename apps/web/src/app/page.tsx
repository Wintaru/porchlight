import type { Metadata } from "next";

import { PostCardList } from "@/components/PostCardList";
import { HomeSidebar } from "@/components/HomeSidebar";
import { createSessionClient } from "@/auth/session-client";
import { canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadFeed } from "@/read-model/feed";
import { loadTagCloud } from "@/read-model/tag";

import styles from "./home.module.css";

interface HomePageProps {
  readonly searchParams: Promise<{ readonly erased?: string }>;
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
  const [{ siteName, siteTagline }, actor, { erased }] = await Promise.all([
    getSiteIdentity(),
    getCurrentActor(),
    searchParams,
  ]);
  const db = await createSessionClient();
  const [posts, tags, mayWriteAnonymously] = await Promise.all([
    loadFeed(db),
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
          <PostCardList posts={posts} empty="Nothing on the porch yet." />
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
