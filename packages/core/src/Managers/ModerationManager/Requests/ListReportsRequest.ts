import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ReportStatus } from "../../../Common/ReportStatus";

export class ListReportsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly status: ReportStatus | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
