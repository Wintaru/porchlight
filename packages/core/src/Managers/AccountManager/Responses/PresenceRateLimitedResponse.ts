import { ResponseBase } from "../../../Common/ResponseBase";

// The member sent more presence reports this minute than any page needs (#89). Names
// when the window ends, for a Retry-After.
export class PresenceRateLimitedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly retryAt: Date,
  ) {
    super(correlationId);
  }
}
