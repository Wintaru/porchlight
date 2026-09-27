import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { ResponseBase } from "../../../Common/ResponseBase";

export class MemberEmailsClaimedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly claims: readonly MemberEmailClaim[],
  ) {
    super(correlationId);
  }
}
