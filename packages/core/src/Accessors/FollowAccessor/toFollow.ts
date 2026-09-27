import type { Tables } from "@porchlight/db";

import type { Follow } from "../../Common/Follow";

export const FOLLOW_COLUMNS = "follower_id, author_id, created_at, tag:tags(slug)";

type FollowRow = Pick<Tables<"follows">, "follower_id" | "author_id" | "created_at"> & {
  readonly tag: { readonly slug: string } | null;
};

// The row as the Managers see it, or undefined for a row with neither target, which
// the `follows_one_target` check refuses.
export function toFollow(row: FollowRow): Follow | undefined {
  const createdAt = new Date(row.created_at);
  if (row.author_id !== null) {
    return {
      followerId: row.follower_id,
      target: { kind: "author", profileId: row.author_id },
      createdAt,
    };
  }
  if (row.tag !== null) {
    return {
      followerId: row.follower_id,
      target: { kind: "tag", slug: row.tag.slug },
      createdAt,
    };
  }
  return undefined;
}
