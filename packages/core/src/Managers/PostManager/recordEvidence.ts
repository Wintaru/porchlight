import type { IEvidenceEngine } from "../../Engines/EvidenceEngine/IEvidenceEngine";
import type { RecordTextEvidenceRequest } from "../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import { TextEvidenceRecordedResponse } from "../../Engines/EvidenceEngine/Responses/TextEvidenceRecordedResponse";

// Writes the evidence envelope for an item that is already stored (SPEC.md §7, #61).
// A failure is logged and does not fail the write: the item exists, and an error here
// would make its author submit it again as a duplicate. The same helper lives in
// CommentManager/ (a Manager may not import another's): keep the two in step.
export async function recordEvidence(
  engine: IEvidenceEngine,
  request: RecordTextEvidenceRequest,
): Promise<void> {
  const recorded = await engine.transform(request);
  if (recorded instanceof TextEvidenceRecordedResponse) {
    return;
  }
  const reason = "reason" in recorded ? recorded.reason : recorded.constructor.name;
  console.error(
    `evidence for ${request.subject.kind} ${request.subject.id} not recorded [${request.correlationId}]`,
    reason,
  );
}
