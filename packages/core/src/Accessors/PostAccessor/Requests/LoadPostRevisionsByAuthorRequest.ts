import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every earlier version of every post one member wrote, for the export bundle.
export class LoadPostRevisionsByAuthorRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
