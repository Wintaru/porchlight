import { createSessionClient } from "@/auth/session-client";
import { rssItemFor } from "@/lib/rss-item";
import { renderRss, rssResponse } from "@/lib/rss";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadTag, loadTagPosts } from "@/read-model/tag";

interface RouteParams {
  readonly params: Promise<{ readonly tag: string }>;
}

// One tag's feed, /t/tag/feed.xml (SPEC.md §9, D21): the phase 1 syndication route —
// an author tags a post, and a Discord (or any) RSS bot subscribes to this feed.
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const slug = (await params).tag;
  const db = await createSessionClient();
  const tag = await loadTag(db, slug);
  if (tag === undefined) {
    return new Response("Not found.", { status: 404 });
  }
  const [{ siteName }, posts] = await Promise.all([
    getSiteIdentity(),
    loadTagPosts(db, tag.id),
  ]);
  return rssResponse(
    renderRss({
      title: `${tag.name} · ${siteName}`,
      link: `${SITE_URL}/t/${tag.slug}`,
      description: `Posts tagged ${tag.name} on ${siteName}`,
      items: posts.map(rssItemFor),
    }),
  );
}
