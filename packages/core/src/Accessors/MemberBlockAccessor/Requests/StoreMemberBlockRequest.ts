import type { MemberBlockLevel } from "../../../Common/MemberBlockLevel";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Set `memberId`'s level for `targetId`, replacing a level already there.
export class StoreMemberBlockRequest extends RequestBase {
  constructor(
    readonly memberId: string,
    readonly targetId: string,
    readonly level: MemberBlockLevel,
    context?: RequestContext,
  ) {
    super(context);
  }
}
