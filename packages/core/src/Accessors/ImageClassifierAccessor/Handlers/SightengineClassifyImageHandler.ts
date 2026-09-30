import type { IHandler } from "../../../Common/IHandler";
import type { ImageClassification } from "../../../Common/ImageClassification";
import type { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";

// Sightengine's check endpoint (docs/setup/classifiers.md, WAYFINDER D17): multipart
// upload, JSON scores per model. The model names and fields below were checked against
// a live response on 2026-09-27; no dashboard workflow is involved.
const SIGHTENGINE_URL = "https://api.sightengine.com/1.0/check.json";
const MODELS = "nudity-2.1,violence,gore,self-harm,offensive,face-age";
// The whole image goes up in the request, so allow for a slow upload; past this the
// scan fails, and the upload with it.
const CLASSIFY_TIMEOUT_MS = 60_000;

// A minors-related hit (D17) is a probable child's face together with sexual content,
// not any photo of a child: a lock freezes the upload as evidence, and a family photo
// must not end up there. Both bars lean toward caution. Sexual content with no face
// that face-age can read gives no minors signal; it still flags or locks on severity.
const MINOR_FACE_AT = 0.5;
const SEXUAL_WITH_MINOR_AT = 0.2;

// Reads one score at a path. Anything but a finite number in [0, 1] is undefined, so
// the caller refuses the body instead of treating the gap as a zero.
function scoreAt(value: unknown, ...path: string[]): number | undefined {
  const leaf = path.reduce<unknown>(
    (node, key) =>
      typeof node === "object" && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined,
    value,
  );
  return typeof leaf === "number" && Number.isFinite(leaf) && leaf >= 0 && leaf <= 1
    ? leaf
    : undefined;
}

// Validates at the boundary and fails closed: a renamed field, a dropped model or a
// "failure" status must fail the upload, never score it as clear. Returns why on refusal.
function readScores(body: unknown): ImageClassification | string {
  if (typeof body !== "object" || body === null) {
    return "Sightengine answered a body this handler could not read";
  }
  const record = body as Record<string, unknown>;
  if (record.status !== "success") {
    const error = record.error;
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "no message";
    return `Sightengine answered status ${String(record.status)}: ${message}`;
  }
  const severity = [
    scoreAt(body, "nudity", "sexual_activity"),
    scoreAt(body, "nudity", "sexual_display"),
    scoreAt(body, "nudity", "erotica"),
    scoreAt(body, "violence", "prob"),
    scoreAt(body, "gore", "prob"),
    scoreAt(body, "self-harm", "prob"),
    scoreAt(body, "offensive", "prob"),
  ];
  const sexual = [
    scoreAt(body, "nudity", "sexual_activity"),
    scoreAt(body, "nudity", "sexual_display"),
    scoreAt(body, "nudity", "erotica"),
    scoreAt(body, "nudity", "very_suggestive"),
  ];
  const faces = record.faces;
  if (!Array.isArray(faces)) {
    return "Sightengine answered no face-age result";
  }
  const minorFaces = faces.map((face: unknown) =>
    scoreAt(face, "attributes", "age", "minor"),
  );
  const max = (values: (number | undefined)[]) =>
    Math.max(0, ...values.map((v) => v ?? 0));
  if ([...severity, ...sexual, ...minorFaces].includes(undefined)) {
    return "Sightengine answered a missing or invalid score";
  }
  return {
    severityScore: max(severity),
    minorsSignal: max(minorFaces) >= MINOR_FACE_AT && max(sexual) >= SEXUAL_WITH_MINOR_AT,
  };
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
      const response = await fetch(SIGHTENGINE_URL, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(CLASSIFY_TIMEOUT_MS),
      });
      if (!response.ok) {
        return new ImageClassifierAccessFailedResponse(
          request.correlationId,
          `Sightengine answered ${String(response.status)}`,
        );
      }
      const scores = readScores(await response.json());
      if (typeof scores === "string") {
        return new ImageClassifierAccessFailedResponse(request.correlationId, scores);
      }
      return new ImageClassifiedResponse(request.correlationId, scores);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new ImageClassifierAccessFailedResponse(request.correlationId, reason);
    }
  }
}
