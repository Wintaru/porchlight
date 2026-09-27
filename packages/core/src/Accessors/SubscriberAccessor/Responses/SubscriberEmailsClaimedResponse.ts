import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import { ResponseBase } from "../../../Common/ResponseBase";

export class SubscriberEmailsClaimedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly claims: readonly SubscriberEmailClaim[],
  ) {
    super(correlationId);
  }
}
