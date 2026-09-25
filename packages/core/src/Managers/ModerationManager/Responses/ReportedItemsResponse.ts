import { ResponseBase } from "../../../Common/ResponseBase";
import type { ReportedItem } from "../ReportedItem";

export class ReportedItemsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly items: readonly ReportedItem[],
    // Open or escalated reports past the list's limit, and so not in `items` (#57).
    readonly hiddenReportCount: number,
  ) {
    super(correlationId);
  }
}
