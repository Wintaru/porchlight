// What ImageClassifierAccessor answers about one image (SPEC.md §7): a single severity
// score standing in for the classifier's violence/gore/sexual/self-harm categories, and
// a separate signal for a minors-related hit. Minors is pulled out on its own because
// the policy locks on it regardless of the severity threshold: "anything the first two
// stages flag as minors-related is locked and goes nowhere else" (WAYFINDER D17).
export interface ImageClassification {
  readonly severityScore: number;
  readonly minorsSignal: boolean;
}
