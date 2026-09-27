import type { Tables } from "@porchlight/db";

import type { MemberBlock } from "../../Common/MemberBlock";

export const MEMBER_BLOCK_COLUMNS = "member_id, target_id, level, created_at";

type MemberBlockRow = Pick<
  Tables<"member_blocks">,
  "member_id" | "target_id" | "level" | "created_at"
>;

// The row as the Managers see it. `level` is the `member_block_level` enum, which
// MEMBER_BLOCK_LEVELS mirrors (toMemberBlock.test.ts keeps the two equal).
export function toMemberBlock(row: MemberBlockRow): MemberBlock {
  return {
    memberId: row.member_id,
    targetId: row.target_id,
    level: row.level,
    createdAt: new Date(row.created_at),
  };
}
