import type { IHandler } from "../../../Common/IHandler";
import type { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import type { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";
import { shieldAuthorization } from "./shieldAuthorization";
import { shieldVerdict } from "./shieldVerdict";

// Project Arachnid's Shield API (docs/setup/hash-matching.md, WAYFINDER D17b). The
// contract is the one the Canadian Centre for Child Protection's own SDK uses
// (github.com/CdnCentreForChildProtection/arachnid-shield-sdk-ts, `scanMediaFromBytes`):
// POST the raw bytes to /v1/media/ with the image's Content-Type and HTTP Basic auth,
// and read `classification` from the answer (shieldVerdict.ts).
const SHIELD_MEDIA_URL = "https://shield.projectarachnid.com/v1/media/";
// The whole image goes up in the request, so allow for a slow upload; past this the
// scan fails, and the upload with it.
const MATCH_TIMEOUT_MS = 60_000;

export class ArachnidShieldMatchImageHashHandler implements IHandler<
  MatchImageHashRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  private readonly authorization: string;

  // `credentials` is Shield's "username:password", the one HASH_MATCH_API_KEY value.
  constructor(credentials: string) {
    this.authorization = shieldAuthorization(credentials);
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
        signal: AbortSignal.timeout(MATCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          `Shield answered ${String(response.status)}`,
        );
      }
      return shieldVerdict(request.correlationId, await response.json());
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new HashMatchAccessFailedResponse(request.correlationId, reason);
    }
  }
}
