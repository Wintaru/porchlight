import { ResponseBase } from "../../../Common/ResponseBase";
import type { ReportedItem } from "../ReportedItem";

export class ReportedItemsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly items: readonly ReportedItem[],
  ) {
    super(correlationId);
  }
}
