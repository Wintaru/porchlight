import { ResponseBase } from "../../../Common/ResponseBase";

// `found` is false when no subscription's link carries the token.
export class SubscriberRemovedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly found: boolean,
  ) {
    super(correlationId);
  }
}
