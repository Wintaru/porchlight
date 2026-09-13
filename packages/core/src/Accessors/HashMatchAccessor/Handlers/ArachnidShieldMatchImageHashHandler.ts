import type { IHandler } from "../../../Common/IHandler";
import type { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";

// Project Arachnid's Shield API (docs/setup/hash-matching.md, WAYFINDER D17b): a
// hash-submission endpoint that fingerprints the image server-side and answers whether
// it matches a known-illegal entry. Confirm the exact endpoint and payload shape
// against Shield's own onboarding docs (gated behind the approved credentials) before
// enabling this in production — the shape below is Shield's documented hash-submission
// contract as of D17b, not something this codebase can verify without the credentials.
const SHIELD_MATCH_URL = "https://api.projectarachnid.com/v3/hash/match";

interface ShieldMatchBody {
  readonly matched: boolean;
}

function isShieldMatchBody(value: unknown): value is ShieldMatchBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { matched?: unknown }).matched === "boolean"
  );
}

export class ArachnidShieldMatchImageHashHandler implements IHandler<
  MatchImageHashRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  constructor(private readonly apiKey: string) {}

  async handle(
    request: MatchImageHashRequest,
  ): Promise<HashMatchResultResponse | HashMatchAccessFailedResponse> {
    try {
      const response = await fetch(SHIELD_MATCH_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/octet-stream",
          "x-sha256": request.sha256,
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
      if (!isShieldMatchBody(body)) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          "Shield answered a body with no boolean matched field",
        );
      }
      return new HashMatchResultResponse(request.correlationId, body.matched);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new HashMatchAccessFailedResponse(request.correlationId, reason);
    }
  }
}
