import { CommentAccessFailedResponse } from "../../Accessors/CommentAccessor/Responses/CommentAccessFailedResponse";
import { PostAccessFailedResponse } from "../../Accessors/PostAccessor/Responses/PostAccessFailedResponse";
import { ProfileAccessFailedResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileAccessFailedResponse";
import { ReactionAccessFailedResponse } from "../../Accessors/ReactionAccessor/Responses/ReactionAccessFailedResponse";
import type { ResponseBase } from "../../Common/ResponseBase";
import { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): CommentUnavailableResponse {
  const reason =
    response instanceof CommentAccessFailedResponse ||
    response instanceof PostAccessFailedResponse ||
    response instanceof ProfileAccessFailedResponse ||
    response instanceof ReactionAccessFailedResponse
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new CommentUnavailableResponse(correlationId, reason);
}
