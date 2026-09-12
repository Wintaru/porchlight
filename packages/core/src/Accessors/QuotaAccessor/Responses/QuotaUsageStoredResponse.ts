import { ResponseBase } from "../../../Common/ResponseBase";

export class QuotaUsageStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bytesUsed: number,
    readonly filesCount: number,
  ) {
    super(correlationId);
  }
}
