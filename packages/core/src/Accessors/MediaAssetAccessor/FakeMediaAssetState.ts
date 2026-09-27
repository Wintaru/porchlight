import type { MediaAsset } from "../../Common/MediaAsset";
import type { NewSubmissionEvidence } from "../../Common/NewSubmissionEvidence";
import type { MediaAuditEvent } from "./MediaAuditEvent";

// The fake's "tables": media assets by id, and the evidence/audit rows a test can
// assert against — mirroring what `finalize_media_scan` writes atomically for real
// (SPEC.md §7). `usedMediaIds` stands in for the posts the fake does not hold: the
// uploads some post still uses (#80). `failing` makes every call answer MediaAssetAccessFailedResponse, for
// the error path.
export class FakeMediaAssetState {
  readonly assets = new Map<string, MediaAsset>();
  readonly evidence: NewSubmissionEvidence[] = [];
  readonly auditEvents: MediaAuditEvent[] = [];
  readonly usedMediaIds = new Set<string>();

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
