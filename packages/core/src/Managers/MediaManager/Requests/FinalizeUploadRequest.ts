import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Confirms what a member's browser already put at the signed URL (SPEC.md §6):
// `mediaId` and `originalFilename` are the same values `RequestUploadUrlRequest`
// answered with, echoed back so the handler can recompute the storage path itself
// rather than trust a path the caller supplies.
export class FinalizeUploadRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    readonly originalFilename: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
