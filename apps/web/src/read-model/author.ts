import type { DbClient } from "@porchlight/db";

import { type PostCard, publicPostCards } from "./post-card";

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
