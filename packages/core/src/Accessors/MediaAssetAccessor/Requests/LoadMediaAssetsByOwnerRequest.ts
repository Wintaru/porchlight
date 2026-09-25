import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// What the editor's upload list narrows to: the newest few, without locked items.
export interface OwnerMediaListing {
  readonly limit: number;
  readonly excludeLocked: boolean;
}

// One member's uploads, newest first (issue #14). The export bundle's manifest and the
// list EraseAccountHandler checks for a `retainUntil` take every one, any scan status
// or retention (`listing` undefined); the editor's list takes a narrowed page (#52).
export class LoadMediaAssetsByOwnerRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
    readonly listing?: OwnerMediaListing,
  ) {
    super(context);
  }
}
