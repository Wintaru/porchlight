import type { ResponseBase } from "../../Common/ResponseBase";
import { NotificationUnavailableResponse } from "./Responses/NotificationUnavailableResponse";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): NotificationUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new NotificationUnavailableResponse(correlationId, reason);
}
