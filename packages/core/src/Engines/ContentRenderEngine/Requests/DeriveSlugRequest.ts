import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A slug from a title. `attempt` 1 is the plain slug; every later attempt carries a
// numeric suffix, so the Manager can retry while the store says the slug is taken.
export class DeriveSlugRequest extends RequestBase {
  constructor(
    readonly title: string,
    readonly attempt: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
