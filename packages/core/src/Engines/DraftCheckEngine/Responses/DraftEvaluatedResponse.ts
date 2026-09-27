import type { DraftWarning } from "../../../Common/DraftWarning";
import { ResponseBase } from "../../../Common/ResponseBase";

// No warnings is an empty list, not a separate response.
export class DraftEvaluatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly warnings: readonly DraftWarning[],
  ) {
    super(correlationId);
  }
}
