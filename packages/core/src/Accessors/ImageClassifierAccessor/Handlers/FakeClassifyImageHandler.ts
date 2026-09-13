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

export class FakeClassifyImageHandler implements IHandler<
  ClassifyImageRequest,
  ImageClassifiedResponse | ImageClassifierAccessFailedResponse
> {
  constructor(private readonly state: FakeImageClassifierState) {}

  handle(
    request: ClassifyImageRequest,
  ): Promise<ImageClassifiedResponse | ImageClassifierAccessFailedResponse> {
    switch (this.state.result) {
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
