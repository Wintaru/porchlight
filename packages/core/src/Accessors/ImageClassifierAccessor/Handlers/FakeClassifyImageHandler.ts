import { DEFAULT_MODERATION_THRESHOLDS } from "../../../Common/ModerationThresholds";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeImageClassifierState } from "../FakeImageClassifierState";
import type { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";

// A severity score strictly between the default flag and lock thresholds, so "flagged"
// lands there under ModerationPolicyEngine's default thresholds without this fake
// needing to know which thresholds a given composition actually passes it.
const FLAGGED_SEVERITY =
  (DEFAULT_MODERATION_THRESHOLDS.flagAt + DEFAULT_MODERATION_THRESHOLDS.lockAt) / 2;

// Bytes that carry this marker score as flagged even when the fake answers clear, so a
// Playwright test can put one flagged upload through a running server without
// restarting it under a different IMAGE_CLASSIFIER_FAKE_RESULT (#36). A decoder ignores
// bytes after an image's end, so the marker rides along after a real image.
export const FAKE_FLAG_MARKER = "porchlight:fake-classifier-flag";
const MARKER_BYTES = new TextEncoder().encode(FAKE_FLAG_MARKER);

export class FakeClassifyImageHandler implements IHandler<
  ClassifyImageRequest,
  ImageClassifiedResponse | ImageClassifierAccessFailedResponse
> {
  constructor(private readonly state: FakeImageClassifierState) {}

  handle(
    request: ClassifyImageRequest,
  ): Promise<ImageClassifiedResponse | ImageClassifierAccessFailedResponse> {
    const result =
      this.state.result === "clear" && carriesMarker(request.bytes)
        ? "flagged"
        : this.state.result;
    switch (result) {
      case "clear":
        return Promise.resolve(
          new ImageClassifiedResponse(request.correlationId, {
            severityScore: 0,
            minorsSignal: false,
          }),
        );
      case "flagged":
        return Promise.resolve(
          new ImageClassifiedResponse(request.correlationId, {
            severityScore: FLAGGED_SEVERITY,
            minorsSignal: false,
          }),
        );
      case "locked":
        return Promise.resolve(
          new ImageClassifiedResponse(request.correlationId, {
            severityScore: 1,
            minorsSignal: true,
          }),
        );
      case "fail":
        return Promise.resolve(
          new ImageClassifierAccessFailedResponse(
            request.correlationId,
            "IMAGE_CLASSIFIER_FAKE_RESULT=fail",
          ),
        );
    }
  }
}

function carriesMarker(bytes: Uint8Array): boolean {
  const last = bytes.length - MARKER_BYTES.length;
  for (let start = Math.max(0, last - 64); start <= last; start += 1) {
    if (MARKER_BYTES.every((byte, index) => bytes[start + index] === byte)) {
      return true;
    }
  }
  return false;
}
