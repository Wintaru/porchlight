import type { ResponseBase } from "../../Common/ResponseBase";
import { AccountUnavailableResponse } from "./Responses/AccountUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log. Checks structurally for a `reason`
// string rather than `instanceof`-checking every one of the accessors' own
// *AccessFailedResponse classes (profiles, posts, comments, reactions, media, storage):
// each already carries the same shape, and importing all of them here just to narrow
// them is not worth it (mirrors MediaManager's own unavailable.ts).
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): AccountUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new AccountUnavailableResponse(correlationId, reason);
}
