import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every upload one member owns, any scan status or retention (issue #14): the export
// bundle's manifest, and the list EraseAccountHandler checks for a `retainUntil` before
// removing a storage object.
export class LoadMediaAssetsByOwnerRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
