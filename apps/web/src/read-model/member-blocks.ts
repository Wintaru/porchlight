import type { DbClient, Enums } from "@porchlight/db";

import type { PostCardAuthor } from "./post-card";

type MemberBlockLevel = Enums<"member_block_level">;

// The viewer's own mutes and blocks (#23), by the other member's profile id. Read under
// RLS, which returns only the viewer's own rows. A visitor has none and costs no query.
export type ViewerBlocks = ReadonlyMap<string, MemberBlockLevel>;

export const NO_BLOCKS: ViewerBlocks = new Map();

export async function loadViewerBlocks(
  db: DbClient,
  viewerId: string | undefined,
): Promise<ViewerBlocks> {
  if (viewerId === undefined) {
    return NO_BLOCKS;
  }
  const { data, error } = await db
    .from("member_blocks")
    .select("target_id, level")
    .eq("member_id", viewerId);
  if (error) {
    throw new Error(`member blocks for ${viewerId}: ${error.message}`);
  }
  return new Map(data.map((row) => [row.target_id, row.level]));
}

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
