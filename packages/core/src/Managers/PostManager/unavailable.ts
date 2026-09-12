import { PostAccessFailedResponse } from "../../Accessors/PostAccessor/Responses/PostAccessFailedResponse";
import type { ResponseBase } from "../../Common/ResponseBase";
import { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): PostUnavailableResponse {
  const reason =
    response instanceof PostAccessFailedResponse
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new PostUnavailableResponse(correlationId, reason);
}
