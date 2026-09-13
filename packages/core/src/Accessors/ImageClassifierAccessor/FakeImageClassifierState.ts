// clear | flagged | locked | fail (.env.example's IMAGE_CLASSIFIER_FAKE_RESULT). The
// handler turns each into an ImageClassification whose severityScore and minorsSignal
// land on the matching side of DEFAULT_MODERATION_THRESHOLDS, so a test can select an
// outcome by name instead of by score.
export const FAKE_IMAGE_CLASSIFIER_RESULTS = [
  "clear",
  "flagged",
  "locked",
  "fail",
] as const;

export type FakeImageClassifierResult = (typeof FAKE_IMAGE_CLASSIFIER_RESULTS)[number];

export class FakeImageClassifierState {
  constructor(readonly result: FakeImageClassifierResult = "clear") {}
}
