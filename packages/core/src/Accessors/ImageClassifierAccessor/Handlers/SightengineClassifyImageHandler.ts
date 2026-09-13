import type { IHandler } from "../../../Common/IHandler";
import type { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";

// Sightengine's image moderation workflow (docs/setup/classifiers.md, WAYFINDER D17):
// multipart upload, JSON scores per category. Confirm the exact model names and score
// ranges against the account's enabled workflow before enabling this in production —
// Sightengine's models are configured per API user, so the field names below may need
// to match whatever the deployment's dashboard actually returns.
const SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json";
const MODELS = "nudity-2.1,violence,gore,self-harm,offensive";

interface SightengineBody {
  readonly nudity?: {
    readonly sexual_activity?: number;
    readonly sexual_display?: number;
  };
  readonly violence?: { readonly prob?: number };
  readonly gore?: { readonly prob?: number };
  readonly ["self-harm"]?: { readonly prob?: number };
  readonly offensive?: { readonly prob?: number };
  readonly minors?: { readonly prob?: number };
}

function isSightengineBody(value: unknown): value is SightengineBody {
  return typeof value === "object" && value !== null;
}

function maxOf(values: (number | undefined)[]): number {
  return values.reduce<number>((max, value) => Math.max(max, value ?? 0), 0);
}

export class SightengineClassifyImageHandler implements IHandler<
  ClassifyImageRequest,
  ImageClassifiedResponse | ImageClassifierAccessFailedResponse
> {
  constructor(
    private readonly apiUser: string,
    private readonly apiSecret: string,
  ) {}

  async handle(
    request: ClassifyImageRequest,
  ): Promise<ImageClassifiedResponse | ImageClassifierAccessFailedResponse> {
    try {
      const form = new FormData();
      form.set(
        "media",
        new Blob([new Uint8Array(request.bytes)], { type: request.mimeType }),
      );
      form.set("models", MODELS);
      form.set("api_user", this.apiUser);
      form.set("api_secret", this.apiSecret);
      const response = await fetch(SIGHTENGINE_URL, { method: "POST", body: form });
      if (!response.ok) {
        return new ImageClassifierAccessFailedResponse(
          request.correlationId,
          `Sightengine answered ${String(response.status)}`,
        );
      }
      const body: unknown = await response.json();
      if (!isSightengineBody(body)) {
        return new ImageClassifierAccessFailedResponse(
          request.correlationId,
          "Sightengine answered a body this handler could not read",
        );
      }
      const severityScore = maxOf([
        body.nudity?.sexual_activity,
        body.nudity?.sexual_display,
        body.violence?.prob,
        body.gore?.prob,
        body["self-harm"]?.prob,
        body.offensive?.prob,
      ]);
      const minorsSignal = (body.minors?.prob ?? 0) > 0;
      return new ImageClassifiedResponse(request.correlationId, {
        severityScore,
        minorsSignal,
      });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new ImageClassifierAccessFailedResponse(request.correlationId, reason);
    }
  }
}
