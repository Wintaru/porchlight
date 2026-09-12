import type { IHandler } from "../../../Common/IHandler";
import type { VerifyTurnstileRequest } from "../Requests/VerifyTurnstileRequest";
import { TurnstileAccessFailedResponse } from "../Responses/TurnstileAccessFailedResponse";
import { TurnstileVerifiedResponse } from "../Responses/TurnstileVerifiedResponse";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyBody {
  readonly success: boolean;
}

function isSiteverifyBody(value: unknown): value is SiteverifyBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

// One call to Cloudflare's siteverify endpoint (D15). A missing token never reaches the
// network: the widget did not run, so there is nothing to verify.
export class CloudflareVerifyTurnstileHandler implements IHandler<
  VerifyTurnstileRequest,
  TurnstileVerifiedResponse | TurnstileAccessFailedResponse
> {
  constructor(private readonly secretKey: string) {}

  async handle(
    request: VerifyTurnstileRequest,
  ): Promise<TurnstileVerifiedResponse | TurnstileAccessFailedResponse> {
    if (request.token === undefined) {
      return new TurnstileVerifiedResponse(request.correlationId, false);
    }
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: this.secretKey,
          response: request.token,
          remoteip: request.remoteIp,
        }),
      });
      const body: unknown = await response.json();
      if (!isSiteverifyBody(body)) {
        return new TurnstileAccessFailedResponse(
          request.correlationId,
          "siteverify answered a body with no boolean success field",
        );
      }
      return new TurnstileVerifiedResponse(request.correlationId, body.success);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new TurnstileAccessFailedResponse(request.correlationId, reason);
    }
  }
}
