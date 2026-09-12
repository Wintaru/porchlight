import { ResponseBase } from "../../../Common/ResponseBase";
import type { QuotaDenialReason } from "../../../Engines/QuotaEngine/QuotaDenialReason";

export class MediaQuotaExceededResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: QuotaDenialReason,
    readonly limit: number,
  ) {
    super(correlationId);
  }
}
