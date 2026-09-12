import type { DbClient } from "@porchlight/db";

import type { PostCardAuthor, PostCardTag } from "./post-card";

// Everything the post page renders. `body_html` is the sanitized render cached on save
// (D3); the page trusts it because nothing else ever writes it. Read under RLS: a
// visitor gets a published post, an author also gets their own drafts (the editor's
// preview), and anyone with the link gets an unlisted post.
const POST_PAGE_COLUMNS =
  "id, slug, title, summary, body_html, status, visibility, comments_enabled, published_at, author_id, author:profiles!posts_author_id_fkey(handle, display_name), post_tags(tag:tags(slug, name))";

export interface PostPage {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body_html: string;
  readonly status: "draft" | "pending" | "published" | "rejected" | "hidden" | "removed";
  readonly visibility: "public" | "unlisted";
  readonly comments_enabled: boolean;
  readonly published_at: string | null;
  // The author's profile id, so the comment tree can badge their own replies.
  readonly author_id: string | null;
  readonly author: PostCardAuthor | null;
  readonly post_tags: readonly { readonly tag: PostCardTag | null }[];
}

// Slugs are unique across the site (D11), so the slug alone finds the post. Shared by
// `/@handle/slug` (which also checks the handle) and `/p/slug` (D11's anonymous route,
// which has no handle to check yet).
export async function loadPostBySlug(
  db: DbClient,
  slug: string,
): Promise<PostPage | undefined> {
  const { data, error } = await db
    .from("posts")
    .select(POST_PAGE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error(`post ${slug}: ${error.message}`);
  }
  return data ?? undefined;
}

// The handle in the URL must still match its author, or the page is a 404: a post is
// never reachable under someone else's name.
export async function loadPostPage(
  db: DbClient,
  handle: string,
  slug: string,
): Promise<PostPage | undefined> {
  const post = await loadPostBySlug(db, slug);
  return post?.author?.handle === handle ? post : undefined;
}

// `proxy.ts`'s 301 check on `/p/slug` (D11): only whether this slug now has a claiming
// author, read under the requester's own session. A handful of columns instead of
// `PostPage`'s full projection, since every still-anonymous view of `/p/slug` — the
// common case — pays for this query and then `AnonymousPostPage` loads the post again
// to render it.
export async function loadPostClaimStatus(
  db: DbClient,
  slug: string,
): Promise<{ readonly slug: string; readonly authorHandle: string } | undefined> {
  const { data, error } = await db
    .from("posts")
    .select("slug, author:profiles!posts_author_id_fkey(handle)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error(`post claim status ${slug}: ${error.message}`);
  }
  return data?.author == null
    ? undefined
    : { slug: data.slug, authorHandle: data.author.handle };
}
