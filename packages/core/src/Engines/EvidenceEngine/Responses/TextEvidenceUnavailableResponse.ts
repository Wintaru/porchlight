import { ResponseBase } from "../../../Common/ResponseBase";

// The site config or the evidence store could not be reached. `reason` is for the log.
export class TextEvidenceUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
