import type { MemberBlock } from "../../Common/MemberBlock";

// The fake's `member_blocks` table, keyed the way its primary key is. `failing` makes
// every call answer MemberBlockAccessFailedResponse, for the error path.
export class FakeMemberBlockState {
  readonly blocks = new Map<string, MemberBlock>();

  constructor(readonly failing = false) {}

  static keyOf(memberId: string, targetId: string): string {
    return `${memberId}:${targetId}`;
  }
}
