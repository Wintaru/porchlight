import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

const DEFAULT_LIMIT = 100;

export class ListAuditLogRequest extends RequestBase {
  readonly limit: number;

  constructor(
    readonly actor: Actor,
    limit?: number,
    context?: RequestContext,
  ) {
    super(context);
    this.limit = limit ?? DEFAULT_LIMIT;
  }
}
