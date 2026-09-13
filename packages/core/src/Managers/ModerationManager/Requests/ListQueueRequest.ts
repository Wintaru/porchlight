import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { QueueFilter } from "../QueueFilter";

export class ListQueueRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly filter: QueueFilter,
    context?: RequestContext,
  ) {
    super(context);
  }
}
