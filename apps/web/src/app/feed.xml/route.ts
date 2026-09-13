import { createSessionClient } from "@/auth/session-client";
import { rssItemFor } from "@/lib/rss-item";
import { renderRss, rssResponse } from "@/lib/rss";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { loadFeed } from "@/read-model/feed";

// The site feed, /feed.xml (SPEC.md §9, D21): the same posts and the same exclusions
// as the home feed, everything public on the site.
export async function GET(): Promise<Response> {
  const posts = await loadFeed(await createSessionClient());
  return rssResponse(
    renderRss({
      title: SITE_NAME,
      link: SITE_URL,
      description: SITE_TAGLINE,
      items: posts.map(rssItemFor),
    }),
  );
}
