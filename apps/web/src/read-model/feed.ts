import type { DbClient } from "@porchlight/db";

import { type PostCard, listedPostCards, publicPostCards } from "./post-card";

// The home feed: newest first, no votes, no rankings (SPEC.md §5, D9). The RSS feed
// and a visitor read this one; it leaves nobody out.
export async function loadFeed(db: DbClient): Promise<readonly PostCard[]> {
  const { data, error } = await publicPostCards(db);
  if (error) {
    throw new Error(`feed: ${error.message}`);
  }
  return data;
}

// The home feed for one viewer: Everything, minus their muted and blocked members,
// left out in the database (#23, #93). A visitor has none, so theirs is one query.
export async function loadFeedFor(
  db: DbClient,
  viewerId: string | undefined,
): Promise<readonly PostCard[]> {
  return viewerId === undefined ? loadFeed(db) : listedPostCards(db, null, "feed");
}
