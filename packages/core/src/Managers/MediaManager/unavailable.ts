import type { ResponseBase } from "../../Common/ResponseBase";
import { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log. Unlike PostManager's own version of
// this helper, this one checks structurally for a `reason` string rather than
// `instanceof`-checking every one of the three Accessors' own *AccessFailedResponse
// classes (media assets, media storage, quotas, site config): each already carries the
// same shape, and importing all four here just to narrow them is not worth it.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): MediaUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new MediaUnavailableResponse(correlationId, reason);
}
