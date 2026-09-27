import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A draft's markdown, and the writer's voice guide (null when they have none), whose
// "banned" section adds to the default banned phrases.
export class EvaluateDraftRequest extends RequestBase {
  constructor(
    readonly bodyMd: string,
    readonly guideMd: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
