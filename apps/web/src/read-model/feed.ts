import type { DbClient } from "@porchlight/db";

import { type PostCard, publicPostCards } from "./post-card";

// The home feed: newest first, no votes, no rankings (SPEC.md §5, D9).
export async function loadFeed(db: DbClient): Promise<readonly PostCard[]> {
  const { data, error } = await publicPostCards(db);
  if (error) {
    throw new Error(`feed: ${error.message}`);
  }
  return data;
}
