import { ResponseBase } from "../../../Common/ResponseBase";

// `found` is false for a token no email carries: an old link, or a mistyped one.
export class UnsubscribedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly found: boolean,
  ) {
    super(correlationId);
  }
}
