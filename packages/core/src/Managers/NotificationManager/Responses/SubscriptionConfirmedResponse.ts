import { ResponseBase } from "../../../Common/ResponseBase";

// `confirmed` is false for an unknown, used or expired link.
export class SubscriptionConfirmedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly confirmed: boolean,
  ) {
    super(correlationId);
  }
}
