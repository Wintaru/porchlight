import type { ResponseBase } from "../../Common/ResponseBase";
import { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log. This Manager touches eight Accessors
// (posts, comments, profiles, media assets, blocks, reports, mod actions, audit log);
// checking structurally for a `reason` string beats `instanceof`-checking every one of
// their own *AccessFailedResponse classes, the same call MediaManager's own version of
// this helper already makes.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): ModerationUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new ModerationUnavailableResponse(correlationId, reason);
}
