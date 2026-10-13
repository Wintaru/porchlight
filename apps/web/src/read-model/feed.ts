import type { DbClient } from "@porchlight/db";

import {
  type PageCursor,
  type PostPage,
  listedPostCards,
  pageOf,
  publicPostCards,
} from "./post-card";

// The home feed: newest first, no votes, no rankings (SPEC.md §5, D9). The RSS feed
// and a visitor read this one; it leaves nobody out.
export async function loadFeed(db: DbClient, before?: PageCursor): Promise<PostPage> {
  const { data, error } = await publicPostCards(db, false, before);
  if (error) {
    throw new Error(`feed: ${error.message}`);
  }
  return pageOf(data);
}

// The home feed for one viewer: Everything, minus their muted and blocked members,
// left out in the database (#23, #93). A visitor has none, so theirs is one query.
export async function loadFeedFor(
  db: DbClient,
  viewerId: string | undefined,
  before?: PageCursor,
): Promise<PostPage> {
  return viewerId === undefined
    ? loadFeed(db, before)
    : listedPostCards(db, null, "feed", before);
}

// When the newest public post went up, or null on an empty site: all the home page's
// poll needs to know whether to re-render (D33). The same answer for every reader.
export async function loadNewestPublishedAt(db: DbClient): Promise<string | null> {
  const { data, error } = await db
    .from("posts")
    .select("published_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`newest post: ${error.message}`);
  }
  return data?.published_at ?? null;
}
