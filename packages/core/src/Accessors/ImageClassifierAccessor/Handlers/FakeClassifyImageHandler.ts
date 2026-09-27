import type { IHandler } from "../../../Common/IHandler";
import type { FakeImageClassifierState } from "../FakeImageClassifierState";
import type { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import type { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import type { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";
import { fakeClassifiedResponse } from "./fakeClassifiedResponse";

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
    return Promise.resolve(fakeClassifiedResponse(request.correlationId, result));
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
