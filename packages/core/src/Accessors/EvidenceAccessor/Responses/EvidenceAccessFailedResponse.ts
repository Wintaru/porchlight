import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached. `reason` is for the log.
export class EvidenceAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
