import type { DbClient } from "@porchlight/db";

import { type PostCard, PAGE_SIZE, publicPostCards } from "./post-card";

// The public columns of a profile (the grant is this column list; `trust_level` stays
// on the server). `status` is what /@handle needs to tell an erased author (410) from
// an active one; suspended and banned profiles are not readable here at all.
const AUTHOR_COLUMNS =
  "id, handle, display_name, avatar_url, bio, role, status, created_at";

export interface Author {
  readonly id: string;
  readonly handle: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly bio: string | null;
  readonly role: "admin" | "moderator" | "member";
  readonly status: "active" | "suspended" | "banned" | "erased";
  readonly created_at: string;
}

export async function loadAuthor(
  db: DbClient,
  handle: string,
): Promise<Author | undefined> {
  const { data, error } = await db
    .from("profiles")
    .select(AUTHOR_COLUMNS)
    .eq("handle", handle)
    .maybeSingle();
  if (error) {
    throw new Error(`author ${handle}: ${error.message}`);
  }
  return data ?? undefined;
}

// Only the status, for the proxy's 410 check on every /@handle request: one small
// column, and undefined when the browser roles cannot see the profile at all.
export async function loadAuthorStatus(
  db: DbClient,
  handle: string,
): Promise<Author["status"] | undefined> {
  const { data, error } = await db
    .from("profiles")
    .select("status")
    .eq("handle", handle)
    .maybeSingle();
  if (error) {
    throw new Error(`author status ${handle}: ${error.message}`);
  }
  return data?.status;
}

// An author's public posts, newest first.
export async function loadAuthorPosts(
  db: DbClient,
  authorId: string,
): Promise<readonly PostCard[]> {
  const { data, error } = await publicPostCards(db).eq("author_id", authorId);
  if (error) {
    throw new Error(`author posts ${authorId}: ${error.message}`);
  }
  return data;
}

// The Profile board's Comments tab: one member's own visible comments, newest first,
// each carrying just enough of its post to link back — the post's own author may be
// anonymous, so `post.author` can be null (the comment then links to `/p/slug`).
// `posts!inner` plus the `visibility` filter matches the rule every other list applies
// (`post-card.ts`'s `publicPostCards`, `loadTagPosts`): unlisted posts are reachable by
// link and appear in no list, so a comment on one must not surface here either.
const AUTHOR_COMMENT_COLUMNS =
  "id, body_html, created_at, post:posts!comments_post_id_fkey!inner(slug, title, visibility, author:profiles!posts_author_id_fkey(handle))";

export interface AuthorCommentPost {
  readonly slug: string;
  readonly title: string;
  readonly author: { readonly handle: string } | null;
}

export interface AuthorComment {
  readonly id: string;
  readonly body_html: string;
  readonly created_at: string;
  readonly post: AuthorCommentPost;
}

export async function loadAuthorComments(
  db: DbClient,
  authorId: string,
): Promise<readonly AuthorComment[]> {
  const { data, error } = await db
    .from("comments")
    .select(AUTHOR_COMMENT_COLUMNS)
    .eq("author_id", authorId)
    .eq("status", "visible")
    .eq("post.visibility", "public")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) {
    throw new Error(`author comments ${authorId}: ${error.message}`);
  }
  // `visibility` is only the filter above; the page renders the rest.
  return data.map(({ id, body_html, created_at, post }) => ({
    id,
    body_html,
    created_at,
    post: { slug: post.slug, title: post.title, author: post.author },
  }));
}
