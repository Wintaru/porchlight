import type { DbClient } from "@porchlight/db";

import { type PostCard, POST_CARD_COLUMNS, PAGE_SIZE } from "./post-card";

export interface TagPage {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

// A tag is public only once a public, published post carries it (SPEC.md §5): a draft's
// new tag name must not show anywhere a visitor can see. `post_tags!inner(posts!inner(id))`
// is an embed used only as a join — the filters on it drop a tag with no such post, and
// toTagPage drops it from the rows. It names `id` because an empty embed reads the whole
// row, and the browser roles may read only the granted columns of `posts` (#29).
const PUBLIC_TAG_COLUMNS = "id, slug, name, post_tags!inner(posts!inner(id))";

function publicTags(db: DbClient) {
  return db
    .from("tags")
    .select(PUBLIC_TAG_COLUMNS)
    .eq("post_tags.posts.status", "published")
    .eq("post_tags.posts.visibility", "public");
}

// The join's embed is only a filter; keep the rows to a tag.
function toTagPage({ id, slug, name }: TagPage): TagPage {
  return { id, slug, name };
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
  return data.map(toTagPage);
}

// The /tags page: every public tag, alphabetically. Unlike the sidebar cloud it has no cap,
// since it is the one place a tag past the cloud's 24 can be reached from.
export async function loadAllTags(db: DbClient): Promise<readonly TagPage[]> {
  const { data, error } = await publicTags(db).order("name", { ascending: true });
  if (error) {
    throw new Error(`all tags: ${error.message}`);
  }
  return data.map(toTagPage);
}

// Undefined for a tag no public post carries, so /t/<slug> and its feed are a 404.
export async function loadTag(db: DbClient, slug: string): Promise<TagPage | undefined> {
  const { data, error } = await publicTags(db).eq("slug", slug).maybeSingle();
  if (error) {
    throw new Error(`tag ${slug}: ${error.message}`);
  }
  return data === null ? undefined : toTagPage(data);
}

// The public posts under one tag, newest first. `matched:post_tags!inner` is a second,
// aliased embed of post_tags that acts as a join: the filter on `matched.tag_id` keeps
// only posts that carry the tag, while the card's own `post_tags` embed still lists
// every tag on each post.
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
