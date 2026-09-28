import type { DbClient, Enums } from "@porchlight/db";

import type { PostCardAuthor } from "./post-card";

type MemberBlockLevel = Enums<"member_block_level">;

// The viewer's mute or block of one member (#23), or undefined: one row of their own
// under RLS, by the (member, target) key. The profile page's buttons need only this.
export async function loadViewerBlockOf(
  db: DbClient,
  viewerId: string,
  targetId: string,
): Promise<MemberBlockLevel | undefined> {
  const { data, error } = await db
    .from("member_blocks")
    .select("level")
    .eq("member_id", viewerId)
    .eq("target_id", targetId)
    .maybeSingle();
  if (error) {
    throw new Error(`member block of ${targetId} for ${viewerId}: ${error.message}`);
  }
  return data?.level;
}

// Every member the viewer muted or blocked (#23), for the lists where anyone may show
// up: a post's comments and typing line, and the home page's "On the porch now". One
// array from `viewer_hidden_author_ids`, so the API's 1000-row cap cannot cut it
// (#93). A visitor has none and costs no query.
export const NO_HIDDEN_AUTHORS: ReadonlySet<string> = new Set();

export async function loadViewerHiddenAuthors(
  db: DbClient,
  viewerId: string | undefined,
): Promise<ReadonlySet<string>> {
  if (viewerId === undefined) {
    return NO_HIDDEN_AUTHORS;
  }
  const { data, error } = await db.rpc("viewer_hidden_author_ids");
  if (error) {
    throw new Error(`hidden authors for ${viewerId}: ${error.message}`);
  }
  return new Set(data);
}

// The settings page's list: each muted or blocked member with the level, newest first.
export interface BlockedMember {
  readonly level: MemberBlockLevel;
  readonly created_at: string;
  readonly target_id: string;
  readonly target: PostCardAuthor | null;
}

export async function loadBlockedMembers(
  db: DbClient,
  viewerId: string,
): Promise<readonly BlockedMember[]> {
  const { data, error } = await db
    .from("member_blocks")
    .select(
      "level, created_at, target_id, target:profiles!member_blocks_target_id_fkey(handle, display_name, avatar_url)",
    )
    .eq("member_id", viewerId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`blocked members for ${viewerId}: ${error.message}`);
  }
  return data;
}
