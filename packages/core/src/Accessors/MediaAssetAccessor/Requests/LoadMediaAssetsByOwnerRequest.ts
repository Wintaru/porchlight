import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// What the editor's upload list narrows to: one post's uploads, or with `postId` null
// the uploads in no post, without locked items (#80).
export interface OwnerMediaListing {
  readonly postId: string | null;
  readonly excludeLocked: boolean;
}

// One member's uploads, newest first (issue #14). The export bundle's manifest and the
// list EraseAccountHandler checks for a `retainUntil` take every one, any scan status
// or retention (`listing` undefined); the editor's list takes one post's (#52, #80).
export class LoadMediaAssetsByOwnerRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
    readonly listing?: OwnerMediaListing,
  ) {
    super(context);
  }
}
