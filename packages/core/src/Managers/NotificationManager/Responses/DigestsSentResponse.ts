import { ResponseBase } from "../../../Common/ResponseBase";

// What one sweep did. `failed` counts emails whose send failed and were put back for the
// next run; `reason` says why, for the log.
export class DigestsSentResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly sent: number,
    readonly failed: number,
    readonly reason: string | null = null,
  ) {
    super(correlationId);
  }
}
