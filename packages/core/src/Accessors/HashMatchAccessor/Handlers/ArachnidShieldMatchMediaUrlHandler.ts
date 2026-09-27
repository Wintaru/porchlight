import type { IHandler } from "../../../Common/IHandler";
import type { MatchMediaUrlRequest } from "../Requests/MatchMediaUrlRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import type { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";
import { shieldAuthorization } from "./shieldAuthorization";
import { shieldVerdict } from "./shieldVerdict";

// Shield's /v1/url/ scans only links on a host verified for the account (it answers
// 403 otherwise), and a signed link is on the storage host, not the site's own. So the
// video is streamed from the signed link into /v1/media/, the endpoint images use,
// which takes video too and checks it frame by frame (#21). The file passes through
// this function without being held in memory.
const SHIELD_MEDIA_URL = "https://shield.projectarachnid.com/v1/media/";
const VIDEO_TYPE = "video/mp4";
// Upload and scan together, kept under the function's 300-second limit so a stalled
// storage host or Shield ends as a failed scan ("try again"), not a killed request.
const SCAN_TIMEOUT_MS = 240_000;

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
    const signal = AbortSignal.timeout(SCAN_TIMEOUT_MS);
    let source: Response | undefined;
    try {
      // `identity`, so the length is the file's own and not a compressed one.
      source = await fetch(request.url, {
        headers: { "accept-encoding": "identity" },
        signal,
      });
      if (!source.ok || source.body === null) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          `the video for Shield answered ${String(source.status)}`,
        );
      }
      const length = source.headers.get("content-length");
      if (length === null) {
        return new HashMatchAccessFailedResponse(
          request.correlationId,
          "the video for Shield came with no length",
        );
      }
      // Shield gets the length up front, so the upload is not chunked. A stream body
      // needs `duplex: "half"` in Node's fetch, an option the DOM type does not list.
      const init: RequestInit & { readonly duplex: "half" } = {
        method: "POST",
        headers: {
          authorization: this.authorization,
          "content-type": source.headers.get("content-type") ?? VIDEO_TYPE,
          "content-length": length,
        },
        body: source.body,
        duplex: "half",
        signal,
      };
      const response = await fetch(SHIELD_MEDIA_URL, init);
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
    } finally {
      // A body nobody read holds its connection open until it is collected.
      if (source?.body && !source.bodyUsed) {
        await source.body.cancel().catch(() => undefined);
      }
    }
  }
}
