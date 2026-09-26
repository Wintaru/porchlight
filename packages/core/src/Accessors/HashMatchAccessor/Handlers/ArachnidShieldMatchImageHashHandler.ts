import type { IHandler } from "../../../Common/IHandler";
import type { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";

// Project Arachnid's Shield API (docs/setup/hash-matching.md, WAYFINDER D17b). The
// contract is the one the Canadian Centre for Child Protection's own SDK uses
// (github.com/CdnCentreForChildProtection/arachnid-shield-sdk-ts, `scanMediaFromBytes`):
// POST the raw bytes to /v1/media/ with the image's Content-Type and HTTP Basic auth,
// and read `classification` from the answer.
const SHIELD_MEDIA_URL = "https://shield.projectarachnid.ca/v1/media/";

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

export class ArachnidShieldMatchImageHashHandler implements IHandler<
  MatchImageHashRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  private readonly authorization: string;

  // `credentials` is Shield's "username:password", the one HASH_MATCH_API_KEY value.
  constructor(credentials: string) {
    // UTF-8 first: `btoa` alone throws on a password with a character outside Latin-1.
    const utf8 = String.fromCharCode(...new TextEncoder().encode(credentials));
    this.authorization = `Basic ${btoa(utf8)}`;
  }

  async handle(
    request: MatchImageHashRequest,
  ): Promise<HashMatchResultResponse | HashMatchAccessFailedResponse> {
    try {
      const response = await fetch(SHIELD_MEDIA_URL, {
        method: "POST",
        headers: {
          authorization: this.authorization,
          "content-type": request.mimeType,
        },
        body: new Uint8Array(request.bytes),
      });
      if (!response.ok) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          `Shield answered ${String(response.status)}`,
        );
      }
      const body: unknown = await response.json();
      if (!isShieldMediaBody(body)) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          "Shield answered a body with no classification field",
        );
      }
      // The SDK passes a null classification. Shield documents no meaning for it, so it
      // is a failed scan here ("try again"), never a pass.
      if (body.classification === null) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          "Shield answered a null classification",
        );
      }
      return new HashMatchResultResponse(
        request.correlationId,
        body.classification !== NO_KNOWN_MATCH,
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new HashMatchAccessFailedResponse(request.correlationId, reason);
    }
  }
}
