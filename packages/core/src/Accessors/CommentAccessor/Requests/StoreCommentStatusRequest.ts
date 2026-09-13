import { RequestBase } from "../../../Common/RequestBase";
import type { CommentStatus } from "../../../Common/CommentStatus";
import type { RequestContext } from "../../../Common/RequestContext";

// A moderator's status transition (#11): approve, reject, hide or remove. Never
// `tombstone` — that stays StoreCommentTombstoneRequest's own shape (no author, no
// body). `rejectionReason` is set for `reject` and cleared (`null`) by any other
// status; omit it to leave the column untouched.
export class StoreCommentStatusRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly status: Exclude<CommentStatus, "tombstone">,
    readonly rejectionReason?: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
