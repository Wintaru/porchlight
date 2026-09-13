import type { Report } from "../../../Common/Report";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ReportListResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reports: readonly Report[],
  ) {
    super(correlationId);
  }
}
