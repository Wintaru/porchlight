import type { DbClient } from "@porchlight/db";

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
