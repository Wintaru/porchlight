import type { SubscriptionOutcome } from "../../../Common/SubscriptionOutcome";
import { ResponseBase } from "../../../Common/ResponseBase";

export class SubscriptionAskedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly outcome: SubscriptionOutcome,
  ) {
    super(correlationId);
  }
}
