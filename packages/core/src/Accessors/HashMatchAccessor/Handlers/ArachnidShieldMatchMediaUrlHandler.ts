import type { IHandler } from "../../../Common/IHandler";
import type { MatchMediaUrlRequest } from "../Requests/MatchMediaUrlRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import type { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";
import { shieldAuthorization } from "./shieldAuthorization";
import { shieldVerdict } from "./shieldVerdict";

// Shield fetches the media itself (#21): POST `{ "url": ... }` as JSON to /v1/url/, the
// contract of the SDK's `scanMediaFromUrl`. Shield checks a video frame by frame.
const SHIELD_URL_URL = "https://shield.projectarachnid.com/v1/url/";

export class ArachnidShieldMatchMediaUrlHandler implements IHandler<
  MatchMediaUrlRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  private readonly authorization: string;

  constructor(credentials: string) {
    this.authorization = shieldAuthorization(credentials);
  }

  async handle(
    request: MatchMediaUrlRequest,
  ): Promise<HashMatchResultResponse | HashMatchAccessFailedResponse> {
    try {
      const response = await fetch(SHIELD_URL_URL, {
        method: "POST",
        headers: {
          authorization: this.authorization,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ url: request.url }),
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
