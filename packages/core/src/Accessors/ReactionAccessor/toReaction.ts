import type { Tables } from "@porchlight/db";

import type { ReactionTarget } from "../../Common/ReactionTarget";
import type { Reaction } from "./Reaction";

// Never `select *`: the shape here is the one the mapper below expects.
export const REACTION_COLUMNS = "post_id, comment_id, profile_id, kind";

export type ReactionRow = Pick<
  Tables<"reactions">,
  "post_id" | "comment_id" | "profile_id" | "kind"
>;

export function toReaction(row: ReactionRow): Reaction {
  return {
    target: toTarget(row),
    profileId: row.profile_id,
    kind: row.kind,
  };
}

// The `reactions_one_target` CHECK guarantees exactly one of the two columns is set.
function toTarget(row: Pick<ReactionRow, "post_id" | "comment_id">): ReactionTarget {
  if (row.post_id !== null) {
    return { kind: "post", id: row.post_id };
  }
  if (row.comment_id !== null) {
    return { kind: "comment", id: row.comment_id };
  }
  throw new Error("reaction has no target");
}
