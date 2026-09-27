import { ResponseBase } from "../../../Common/ResponseBase";

// `confirmed` is false for an unknown, used or expired token.
export class SubscriptionConfirmationStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly confirmed: boolean,
  ) {
    super(correlationId);
  }
}
