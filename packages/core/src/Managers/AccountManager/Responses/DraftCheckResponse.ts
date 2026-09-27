import type { DraftWarning } from "../../../Common/DraftWarning";
import { ResponseBase } from "../../../Common/ResponseBase";

export class DraftCheckResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly warnings: readonly DraftWarning[],
  ) {
    super(correlationId);
  }
}
