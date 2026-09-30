import { MATURE_TAG } from "@porchlight/core/client";
import type { DbClient } from "@porchlight/db";

import {
  type PostCard,
  POST_CARD_COLUMNS,
  PAGE_SIZE,
  listedPostCards,
} from "./post-card";

export interface TagPage {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

// A tag is public only once a public, published post carries it (SPEC.md §5): a draft's
// new tag name must not show anywhere a visitor can see. `public_tags` is that rule in
// the database; it returns tag rows only, so the columns are named here.
const PUBLIC_TAG_COLUMNS = "id, slug, name";

function publicTags(db: DbClient) {
  return db.rpc("public_tags").select(PUBLIC_TAG_COLUMNS);
}

// The Main board's sidebar tag cloud: every public tag, alphabetically, capped at one
// page — names only, no post rows.
const TAG_CLOUD_LIMIT = 24;

export async function loadTagCloud(db: DbClient): Promise<readonly TagPage[]> {
  const { data, error } = await publicTags(db)
    .order("name", { ascending: true })
    .limit(TAG_CLOUD_LIMIT);
  if (error) {
    throw new Error(`tag cloud: ${error.message}`);
  }
  return data;
}

// The /tags page: every public tag, alphabetically. Unlike the sidebar cloud it has no cap,
// since it is the one place a tag past the cloud's 24 can be reached from.
export async function loadAllTags(db: DbClient): Promise<readonly TagPage[]> {
  const { data, error } = await publicTags(db).order("name", { ascending: true });
  if (error) {
    throw new Error(`all tags: ${error.message}`);
  }
  return data;
}

// The editor's suggestions as a member types a tag: public names only, so a draft's new
// tag is never offered to anyone else. The content note has its own checkbox.
export async function loadSuggestedTagNames(db: DbClient): Promise<readonly string[]> {
  const tags = await loadAllTags(db);
  return tags.filter((tag) => tag.slug !== MATURE_TAG).map((tag) => tag.name);
}

// Undefined for a tag no public post carries, so /t/<slug> and its feed are a 404.
export async function loadTag(db: DbClient, slug: string): Promise<TagPage | undefined> {
  const { data, error } = await publicTags(db).eq("slug", slug).maybeSingle();
  if (error) {
    throw new Error(`tag ${slug}: ${error.message}`);
  }
  return data ?? undefined;
}

// The public posts under one tag, newest first. `matched:post_tags!inner` is a second,
// aliased embed of post_tags that acts as a join: the filter on `matched.tag_id` keeps
// only posts that carry the tag, while the card's own `post_tags` embed still lists
// every tag on each post. The tag's RSS feed and a visitor read this one.
export async function loadTagPosts(
  db: DbClient,
  tagId: string,
): Promise<readonly PostCard[]> {
  const { data, error } = await db
    .from("posts")
    .select(`${POST_CARD_COLUMNS}, matched:post_tags!inner(tag_id)`)
    .eq("matched.tag_id", tagId)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) {
    throw new Error(`tag posts ${tagId}: ${error.message}`);
  }
  return data;
}

// The tag page for one viewer: a signed-in viewer's muted and blocked members are left
// out in the database (#23, #93). A visitor has none, so theirs is one query.
export async function loadTagPostsFor(
  db: DbClient,
  tagId: string,
  viewerId: string | undefined,
): Promise<readonly PostCard[]> {
  return viewerId === undefined
    ? loadTagPosts(db, tagId)
    : listedPostCards(db, tagId, `tag posts ${tagId}`);
}
