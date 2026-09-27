import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";

// The one classification that means "no match". Any other value is a match, the same
// as in the SDK: a classification Shield adds later holds the item rather
// than letting it through (SPEC.md §7, thresholds only move toward caution).
const NO_KNOWN_MATCH = "no-known-match";

interface ShieldMediaBody {
  readonly classification: string | null;
}

function isShieldMediaBody(value: unknown): value is ShieldMediaBody {
  if (typeof value !== "object" || value === null || !("classification" in value)) {
    return false;
  }
  const { classification } = value;
  return classification === null || typeof classification === "string";
}

// Shield answers the same body for an image and for a video, both sent to /v1/media/. A
// video takes the most severe classification of any frame, so one reading serves both.
export function shieldVerdict(
  correlationId: string,
  body: unknown,
): HashMatchResultResponse | HashMatchAccessFailedResponse {
  if (!isShieldMediaBody(body)) {
    return new HashMatchAccessFailedResponse(
      correlationId,
      "Shield answered a body with no classification field",
    );
  }
  // The SDK passes a null classification. Shield documents no meaning for it, so it is
  // a failed scan here ("try again"), never a pass.
  if (body.classification === null) {
    return new HashMatchAccessFailedResponse(
      correlationId,
      "Shield answered a null classification",
    );
  }
  return new HashMatchResultResponse(
    correlationId,
    body.classification !== NO_KNOWN_MATCH,
  );
}
