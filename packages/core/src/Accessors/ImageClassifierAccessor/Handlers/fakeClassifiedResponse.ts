import { DEFAULT_MODERATION_THRESHOLDS } from "../../../Common/ModerationThresholds";
import type { FakeImageClassifierResult } from "../FakeImageClassifierState";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";

// A severity score strictly between the default flag and lock thresholds, so "flagged"
// lands there under ModerationPolicyEngine's default thresholds without this fake
// needing to know which thresholds a given composition actually passes it.
const FLAGGED_SEVERITY =
  (DEFAULT_MODERATION_THRESHOLDS.flagAt + DEFAULT_MODERATION_THRESHOLDS.lockAt) / 2;

// The answer a fake result names, for an image or a video alike.
export function fakeClassifiedResponse(
  correlationId: string,
  result: FakeImageClassifierResult,
): ImageClassifiedResponse | ImageClassifierAccessFailedResponse {
  switch (result) {
    case "clear":
      return new ImageClassifiedResponse(correlationId, {
        severityScore: 0,
        minorsSignal: false,
      });
    case "flagged":
      return new ImageClassifiedResponse(correlationId, {
        severityScore: FLAGGED_SEVERITY,
        minorsSignal: false,
      });
    case "locked":
      return new ImageClassifiedResponse(correlationId, {
        severityScore: 1,
        minorsSignal: true,
      });
    case "fail":
      return new ImageClassifierAccessFailedResponse(
        correlationId,
        "IMAGE_CLASSIFIER_FAKE_RESULT=fail",
      );
  }
}
