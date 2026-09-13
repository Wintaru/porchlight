import { ResponseBase } from "../../../Common/ResponseBase";
import type { QueueItem } from "../QueueItem";

export class QueueResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly items: readonly QueueItem[],
  ) {
    super(correlationId);
  }
}
