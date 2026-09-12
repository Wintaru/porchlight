import { ResponseBase } from "../../../Common/ResponseBase";

// The vendor could not be reached. `reason` is for the log, never for a visitor: the
// Engine treats this the same as a failed challenge (SPEC.md §4, maximum caution).
export class TurnstileAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
