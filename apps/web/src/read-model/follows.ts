import type { DbClient } from "@porchlight/db";

import { PAGE_SIZE, POST_CARD_COLUMNS, type PostCard } from "./post-card";

// What the viewer follows (#24), from their own rows under RLS: author profile ids and
// tag slugs. A visitor follows nothing and costs no query.
export interface ViewerFollows {
  readonly authors: ReadonlySet<string>;
  readonly tags: ReadonlySet<string>;
}

export const NO_FOLLOWS: ViewerFollows = { authors: new Set(), tags: new Set() };

export async function loadViewerFollows(
  db: DbClient,
  viewerId: string | undefined,
): Promise<ViewerFollows> {
  if (viewerId === undefined) {
    return NO_FOLLOWS;
  }
  const { data, error } = await db
    .from("follows")
    .select("author_id, tag:tags(slug)")
    .eq("follower_id", viewerId);
  if (error) {
    throw new Error(`follows for ${viewerId}: ${error.message}`);
  }
  return {
    authors: new Set(
      data.flatMap((row) => (row.author_id === null ? [] : [row.author_id])),
    ),
    tags: new Set(data.flatMap((row) => (row.tag === null ? [] : [row.tag.slug]))),
  };
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
