import type { Report } from "../../../Common/Report";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ReportFiledResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly report: Report,
  ) {
    super(correlationId);
  }
}
