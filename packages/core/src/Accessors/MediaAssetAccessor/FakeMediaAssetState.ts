import type { MediaAsset } from "../../Common/MediaAsset";

// The fake's "table": media assets by id. `failing` makes every call answer
// MediaAssetAccessFailedResponse, for the error path.
export class FakeMediaAssetState {
  readonly assets = new Map<string, MediaAsset>();

  constructor(readonly failing = false) {}

  countForAnonymousAuthor(anonymousAuthorId: string): number {
    let count = 0;
    for (const asset of this.assets.values()) {
      if (
        asset.owner.kind === "anonymous" &&
        asset.owner.anonymousAuthorId === anonymousAuthorId
      ) {
        count += 1;
      }
    }
    return count;
  }
}
