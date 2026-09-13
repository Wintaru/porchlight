import type { Report } from "../../../Common/Report";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ReportsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reports: readonly Report[],
  ) {
    super(correlationId);
  }
}
