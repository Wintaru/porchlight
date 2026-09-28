import type { DbClient } from "@porchlight/db";

import { PAGE_SIZE, POST_CARD_COLUMNS, type PostCard } from "./post-card";

// Whether the viewer follows this author, or this tag (#24): one row of their own
// under RLS, by the unique (follower, target) index. Only a member sees the button.
export async function isFollowingAuthor(
  db: DbClient,
  viewerId: string,
  authorId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("follows")
    .select("id")
    .eq("follower_id", viewerId)
    .eq("author_id", authorId)
    .maybeSingle();
  if (error) {
    throw new Error(`follow of author ${authorId}: ${error.message}`);
  }
  return data !== null;
}

export async function isFollowingTag(
  db: DbClient,
  viewerId: string,
  tagId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("follows")
    .select("id")
    .eq("follower_id", viewerId)
    .eq("tag_id", tagId)
    .maybeSingle();
  if (error) {
    throw new Error(`follow of tag ${tagId}: ${error.message}`);
  }
  return data !== null;
}

// The Following feed: `following_post_ids` picks the posts (followed authors and tags,
// minus muted members), then one query loads their cards in the same order.
export async function loadFollowingFeed(db: DbClient): Promise<readonly PostCard[]> {
  const { data: picked, error } = await db.rpc("following_post_ids", {
    p_limit: PAGE_SIZE,
  });
  if (error) {
    throw new Error(`following feed: ${error.message}`);
  }
  if (picked.length === 0) {
    return [];
  }
  const { data: cards, error: cardError } = await db
    .from("posts")
    .select(POST_CARD_COLUMNS)
    .in(
      "id",
      picked.map((row) => row.id),
    );
  if (cardError) {
    throw new Error(`following feed cards: ${cardError.message}`);
  }
  const byId = new Map(cards.map((card) => [card.id, card]));
  return picked.flatMap((row) => byId.get(row.id) ?? []);
}

// How many members have a public post out: the Following tab shows from two (D20).
export async function loadPublishedAuthorCount(db: DbClient): Promise<number> {
  const { data, error } = await db.rpc("published_author_count");
  if (error) {
    throw new Error(`published author count: ${error.message}`);
  }
  return data;
}
