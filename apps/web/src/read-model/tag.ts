import type { DbClient } from "@porchlight/db";

import { type PostCard, POST_CARD_COLUMNS, PAGE_SIZE } from "./post-card";

export interface TagPage {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

// The Main board's sidebar tag cloud: every tag, alphabetically, capped at one page —
// a name and a count, no post rows.
const TAG_CLOUD_LIMIT = 24;

export async function loadTagCloud(db: DbClient): Promise<readonly TagPage[]> {
  const { data, error } = await db
    .from("tags")
    .select("id, slug, name")
    .order("name", { ascending: true })
    .limit(TAG_CLOUD_LIMIT);
  if (error) {
    throw new Error(`tag cloud: ${error.message}`);
  }
  return data;
}

export async function loadTag(db: DbClient, slug: string): Promise<TagPage | undefined> {
  const { data, error } = await db
    .from("tags")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error(`tag ${slug}: ${error.message}`);
  }
  return data ?? undefined;
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
