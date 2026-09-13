import type { PostCard } from "@/read-model/post-card";
import type { RssItem } from "./rss";
import { SITE_URL } from "./site";

// Every feed lists a `PostCard` (SPEC.md §9): the same shape and the same exclusions
// (unlisted, pending, hidden) as every HTML list on the site. An unclaimed anonymous
// post (D11) has no author yet, so its only route is `/p/slug`, the same fallback
// `PostCardList` renders as "anonymous".
export function rssItemFor(post: PostCard): RssItem {
  const link =
    post.author === null
      ? `${SITE_URL}/p/${post.slug}`
      : `${SITE_URL}/@${post.author.handle}/${post.slug}`;
  return {
    title: post.title,
    link,
    guid: link,
    pubDate: post.published_at === null ? null : new Date(post.published_at),
    description: post.summary,
  };
}
