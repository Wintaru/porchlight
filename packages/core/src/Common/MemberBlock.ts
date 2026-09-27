import type { MemberBlockLevel } from "./MemberBlockLevel";

// One member's mute or block of another (#23). The other member is never told.
export interface MemberBlock {
  readonly memberId: string;
  readonly targetId: string;
  readonly level: MemberBlockLevel;
  readonly createdAt: Date;
}
