import type { IHandler } from "../../../Common/IHandler";
import type { FakeEvidenceState } from "../FakeEvidenceState";
import type { StoreTextEvidenceRequest } from "../Requests/StoreTextEvidenceRequest";
import { EvidenceAccessFailedResponse } from "../Responses/EvidenceAccessFailedResponse";
import { EvidenceStoredResponse } from "../Responses/EvidenceStoredResponse";

export class FakeStoreTextEvidenceHandler implements IHandler<
  StoreTextEvidenceRequest,
  EvidenceStoredResponse | EvidenceAccessFailedResponse
> {
  constructor(private readonly state: FakeEvidenceState) {}

  handle(
    request: StoreTextEvidenceRequest,
  ): Promise<EvidenceStoredResponse | EvidenceAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new EvidenceAccessFailedResponse(
          request.correlationId,
          "EVIDENCE_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.rows.push(request.evidence);
    return Promise.resolve(new EvidenceStoredResponse(request.correlationId));
  }
}
