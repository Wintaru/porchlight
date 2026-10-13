import type { DbClient, Enums } from "@porchlight/db";

import { carriesMatureTag } from "@porchlight/core/client";

// The shape every list on the site shows for one post: the feed, an author's page, a
// tag page. Names its columns (never `select *`, the grants are column lists) and the
// three embeds: the author through the posts→profiles key, the tags through post_tags,
// and the cover the feed card shows (#73). An anonymous post has no author row until
// it is claimed (D7): `author` is null. The cover's `published_path` is null until the
// scan passes, and the grants hide it from anyone else (#36), as on the post page. The
// three `cover_` numbers are how the author framed the cover in the card's box.
// `visibility` marks a private post (D27): RLS hands one only to its author, whose own
// feed and profile show it with the "Only you" chip.
export const POST_CARD_COLUMNS =
  "id, slug, title, summary, excerpt, published_at, comments_enabled, visibility, cover_focus_x, cover_focus_y, cover_zoom, author:profiles!posts_author_id_fkey(handle, display_name, avatar_url), post_tags(tag:tags(slug, name)), cover:media_assets!posts_cover_media_id_fkey(published_path, mature)";

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
  readonly excerpt: string | null;
  readonly published_at: string | null;
  readonly comments_enabled: boolean;
  readonly visibility: Enums<"post_visibility">;
  readonly cover_focus_x: number;
  readonly cover_focus_y: number;
  readonly cover_zoom: number;
  readonly author: PostCardAuthor | null;
  readonly post_tags: readonly { readonly tag: PostCardTag | null }[];
  readonly cover: {
    readonly published_path: string | null;
    readonly mature: boolean;
  } | null;
}

// The one line a card, a share preview or a feed item shows: the author's summary, else
// the body's first sentence (D18), which the database keeps in `excerpt`. A mature post
// shows none, since its text is blurred until the reader asks (#117).
export function summaryLine(post: {
  readonly summary: string | null;
  readonly excerpt: string | null;
  readonly post_tags: readonly { readonly tag: { readonly slug: string } | null }[];
}): string | null {
  return carriesMatureTag(post.post_tags) ? null : (post.summary ?? post.excerpt);
}

// How many cards one list shows.
export const PAGE_SIZE = 20;
// One more than a page is read, so the extra card says whether an older page exists.
export const PAGE_FETCH_SIZE = PAGE_SIZE + 1;

// Where the page after this one starts: its last card. Lists sort by (published_at, id),
// newest first, so the next page is every post before this pair.
export interface PageCursor {
  readonly publishedAt: string;
  readonly id: string;
}

// One page of a list, and the cursor for the older page, or undefined on the last page.
export interface PostPage {
  readonly posts: readonly PostCard[];
  readonly older: PageCursor | undefined;
}

export function pageOf(cards: readonly PostCard[]): PostPage {
  const posts = cards.slice(0, PAGE_SIZE);
  const last = cards.length > PAGE_SIZE ? posts.at(-1) : undefined;
  return {
    posts,
    older:
      last?.published_at == null
        ? undefined
        : { publishedAt: last.published_at, id: last.id },
  };
}

// The PostgREST filter for the posts before a cursor at the same time as it; the caller
// adds `published_at <= publishedAt`, which the feed index can serve. The time is
// quoted, since it carries `:` and `.`.
export function beforeCursorFilter(before: PageCursor): string {
  return `published_at.lt."${before.publishedAt}",id.lt.${before.id}`;
}

// The same cursor as arguments to `listed_post_ids` and `following_post_ids`.
export function beforeCursorArgs(before: PageCursor | undefined): {
  p_before_at?: string;
  p_before_id?: string;
} {
  return before === undefined
    ? {}
    : { p_before_at: before.publishedAt, p_before_id: before.id };
}

// Every public list starts here: published, public, newest first (SPEC.md §5). RLS
// already hides anything unpublished; `visibility` is the listing rule this module
// applies on top, so an unlisted post is reachable by link and appears in no list.
// A signed-in viewer's lists leave out their muted and blocked members (#23) in the
// database instead: `listed_post_ids` picks the ids and `cardsInOrder` loads them.
// `withPrivate` adds private posts (D27) for an author's own profile: RLS hands a
// private post to its author only, so no other reader ever gets one from it.
export function publicPostCards(db: DbClient, withPrivate = false, before?: PageCursor) {
  const published = db.from("posts").select(POST_CARD_COLUMNS).eq("status", "published");
  const listed = withPrivate
    ? published.in("visibility", ["public", "private"])
    : published.eq("visibility", "public");
  return (
    before === undefined
      ? listed
      : listed.lte("published_at", before.publishedAt).or(beforeCursorFilter(before))
  )
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_FETCH_SIZE);
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

// A signed-in viewer's page of a list, newest first, minus the members they muted or
// blocked (#93): the whole site (no tag), or one tag's posts.
export async function listedPostCards(
  db: DbClient,
  tagId: string | null,
  label: string,
  before?: PageCursor,
): Promise<PostPage> {
  const { data, error } = await db.rpc("listed_post_ids", {
    ...(tagId === null ? {} : { p_tag_id: tagId }),
    ...beforeCursorArgs(before),
    p_limit: PAGE_FETCH_SIZE,
  });
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return pageOfPicked(db, data, label);
}

// A page from ids a database function picked, one more than a page: only the shown ones
// are loaded as cards, and the older cursor comes from the picked rows, so a post removed
// between the two reads cannot hide the way on.
export async function pageOfPicked(
  db: DbClient,
  picked: readonly { readonly id: string; readonly published_at: string }[],
  label: string,
): Promise<PostPage> {
  const last = picked.length > PAGE_SIZE ? picked[PAGE_SIZE - 1] : undefined;
  return {
    posts: await cardsInOrder(db, picked.slice(0, PAGE_SIZE), label),
    older:
      last === undefined ? undefined : { publishedAt: last.published_at, id: last.id },
  };
}
