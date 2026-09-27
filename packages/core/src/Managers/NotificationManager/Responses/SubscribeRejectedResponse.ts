import { ResponseBase } from "../../../Common/ResponseBase";

export type SubscribeRejection =
  // The site has no mail vendor.
  | "email-off"
  // Not an address, or a schedule other than hourly or daily.
  | "invalid"
  | "turnstile-failed"
  | "rate-limited"
  | "no-such-author";

export class SubscribeRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: SubscribeRejection,
  ) {
    super(correlationId);
  }
}
