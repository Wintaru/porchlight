import type { DbClient } from "@porchlight/db";

import { loadViewerBlocks } from "./member-blocks";
import { type PostCard, publicPostCards } from "./post-card";

// The home feed: newest first, no votes, no rankings (SPEC.md §5, D9). A signed-in
// viewer's muted and blocked members are left out (#23); the RSS feed passes none.
export async function loadFeed(
  db: DbClient,
  hiddenAuthors: Iterable<string> = [],
): Promise<readonly PostCard[]> {
  const { data, error } = await publicPostCards(db, hiddenAuthors);
  if (error) {
    throw new Error(`feed: ${error.message}`);
  }
  return data;
}

// The home feed for one viewer: Everything, minus their muted and blocked members, left
// out at the source (#23). A visitor has none, so theirs is one query.
export async function loadFeedFor(
  db: DbClient,
  viewerId: string | undefined,
): Promise<readonly PostCard[]> {
  const blocks = await loadViewerBlocks(db, viewerId);
  return loadFeed(db, blocks.keys());
}
