import type { DbClient } from "@porchlight/db";

// The shape every list on the site shows for one post: the feed, an author's page, a
// tag page. Names its columns (never `select *`, the grants are column lists) and the
// two embeds: the author through the posts→profiles key, the tags through post_tags.
// An anonymous post has no author row until it is claimed (D7): `author` is null.
export const POST_CARD_COLUMNS =
  "id, slug, title, summary, published_at, comments_enabled, author:profiles!posts_author_id_fkey(handle, display_name, avatar_url), post_tags(tag:tags(slug, name))";

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
}

// How many cards one list shows. Paging arrives with #16's feed board.
export const PAGE_SIZE = 20;

// Every public list starts here: published, public, newest first (SPEC.md §5). RLS
// already hides anything unpublished; `visibility` is the listing rule this module
// applies on top, so an unlisted post is reachable by link and appears in no list.
export function publicPostCards(db: DbClient) {
  return db
    .from("posts")
    .select(POST_CARD_COLUMNS)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(PAGE_SIZE);
}
