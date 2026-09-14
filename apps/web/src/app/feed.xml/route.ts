import { createSessionClient } from "@/auth/session-client";
import { rssItemFor } from "@/lib/rss-item";
import { renderRss, rssResponse } from "@/lib/rss";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadFeed } from "@/read-model/feed";

// The site feed, /feed.xml (SPEC.md §9, D21): the same posts and the same exclusions
// as the home feed, everything public on the site.
export async function GET(): Promise<Response> {
  const [{ siteName, siteTagline }, posts] = await Promise.all([
    getSiteIdentity(),
    loadFeed(await createSessionClient()),
  ]);
  return rssResponse(
    renderRss({
      title: siteName,
      link: SITE_URL,
      description: siteTagline,
      items: posts.map(rssItemFor),
    }),
  );
}
