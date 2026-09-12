import { ResponseBase } from "../../../Common/ResponseBase";
import type { QuotaDenialReason } from "../QuotaDenialReason";

// `limit` is the cap the request tripped, in the reason's own unit (bytes for the two
// byte reasons, a file count for `file-count-cap`), so the Client can say why in one
// sentence without recomputing it.
export class QuotaExceededResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: QuotaDenialReason,
    readonly limit: number,
  ) {
    super(correlationId);
  }
}
