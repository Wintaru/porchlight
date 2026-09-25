import type { TextEvidence } from "./TextEvidence";

// The fake's `submission_evidence` rows, for a test to assert against. `failing` makes
// every call answer EvidenceAccessFailedResponse, for the error path.
export class FakeEvidenceState {
  readonly rows: TextEvidence[] = [];

  constructor(readonly failing = false) {}
}
