import type { ResponseBase } from "../../Common/ResponseBase";
import { AnonymousGuardUnavailableResponse } from "./Responses/AnonymousGuardUnavailableResponse";

// Four different Accessors sit behind this Engine, each with its own *AccessFailedResponse
// class carrying a `reason` field. Reading the field structurally, instead of an
// instanceof chain naming all four, keeps this helper from growing every time a fifth
// Accessor joins the sequence; every one of them still narrows its own success cases
// with instanceof at its call site, so this is only ever reached for a logged reason.
export function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): AnonymousGuardUnavailableResponse {
  const reason = hasReason(response)
    ? response.reason
    : `unexpected ${response.constructor.name} from ${method}`;
  return new AnonymousGuardUnavailableResponse(correlationId, reason);
}

function hasReason(
  response: ResponseBase,
): response is ResponseBase & { reason: string } {
  return (
    "reason" in response &&
    typeof (response as ResponseBase & { reason?: unknown }).reason === "string"
  );
}
