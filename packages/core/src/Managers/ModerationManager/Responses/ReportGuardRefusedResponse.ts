import { ResponseBase } from "../../../Common/ResponseBase";
import type { AnonymousGuardDenialReason } from "../../../Engines/AnonymousGuardEngine/AnonymousGuardDenialReason";

// The D15 admission guard refused a visitor's report (#40): a failed challenge, a
// block, or the rate limit. The Client shows one generic message for all three.
export class ReportGuardRefusedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AnonymousGuardDenialReason,
  ) {
    super(correlationId);
  }
}
