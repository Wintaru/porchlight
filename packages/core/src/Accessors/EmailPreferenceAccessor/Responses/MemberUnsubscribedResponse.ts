import { ResponseBase } from "../../../Common/ResponseBase";

// `found` is false when no member's link carries the token.
export class MemberUnsubscribedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly found: boolean,
  ) {
    super(correlationId);
  }
}
