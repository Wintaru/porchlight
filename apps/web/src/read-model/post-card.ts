import type { DbClient } from "@porchlight/db";

// The shape every list on the site shows for one post: the feed, an author's page, a
// tag page. Names its columns (never `select *`, the grants are column lists) and the
// three embeds: the author through the posts→profiles key, the tags through post_tags,
// and the cover the feed card shows (#73). An anonymous post has no author row until
// it is claimed (D7): `author` is null. The cover's `published_path` is null until the
// scan passes, and the grants hide it from anyone else (#36), as on the post page.
export const POST_CARD_COLUMNS =
  "id, slug, title, summary, published_at, comments_enabled, author:profiles!posts_author_id_fkey(handle, display_name, avatar_url), post_tags(tag:tags(slug, name)), cover:media_assets!posts_cover_media_id_fkey(published_path, mature)";

export interface PostCardAuthor {
  readonly handle: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
}

export interface PostCardTag {
  readonly slug: string;
  readonly name: string;
}

export interface PostCard {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly published_at: string | null;
  readonly comments_enabled: boolean;
  readonly author: PostCardAuthor | null;
  readonly post_tags: readonly { readonly tag: PostCardTag | null }[];
  readonly cover: {
    readonly published_path: string | null;
    readonly mature: boolean;
  } | null;
}

// How many cards one list shows. Paging arrives with #16's feed board.
export const PAGE_SIZE = 20;

// Every public list starts here: published, public, newest first (SPEC.md §5). RLS
// already hides anything unpublished; `visibility` is the listing rule this module
// applies on top, so an unlisted post is reachable by link and appears in no list.
// A signed-in viewer's lists leave out their muted and blocked members (#23) in the
// database instead: `listed_post_ids` picks the ids and `cardsInOrder` loads them.
export function publicPostCards(db: DbClient) {
  return db
    .from("posts")
    .select(POST_CARD_COLUMNS)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(PAGE_SIZE);
}

// The cards for ids a database function picked, in the function's order, in one query.
// `label` names the list in an error.
export async function cardsInOrder(
  db: DbClient,
  picked: readonly { readonly id: string }[],
  label: string,
): Promise<readonly PostCard[]> {
  if (picked.length === 0) {
    return [];
  }
  const { data, error } = await db
    .from("posts")
    .select(POST_CARD_COLUMNS)
    .in(
      "id",
      picked.map((row) => row.id),
    );
  if (error) {
    throw new Error(`${label} cards: ${error.message}`);
  }
  const byId = new Map(data.map((card) => [card.id, card]));
  return picked.flatMap((row) => byId.get(row.id) ?? []);
}

// A signed-in viewer's list as cards, newest first, minus the members they muted or
// blocked (#93): the whole site (no tag), or one tag's posts.
export async function listedPostCards(
  db: DbClient,
  tagId: string | null,
  label: string,
): Promise<readonly PostCard[]> {
  const { data, error } = await db.rpc("listed_post_ids", {
    ...(tagId === null ? {} : { p_tag_id: tagId }),
    p_limit: PAGE_SIZE,
  });
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return cardsInOrder(db, data, label);
}
