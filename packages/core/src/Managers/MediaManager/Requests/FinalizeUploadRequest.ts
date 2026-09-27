import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ConvertedSource } from "../ConvertedSource";

// Confirms what a member's browser already put at the signed URL (SPEC.md §6):
// `mediaId` and `originalFilename` are the same values `RequestUploadUrlRequest`
// answered with, echoed back so the handler can recompute the storage path itself
// rather than trust a path the caller supplies. `clientIp` and `userAgent` feed #10's
// evidence envelope; a member has no Turnstile result to carry, since the widget never
// shows for a signed-in write. `convertedFrom` is the file a browser converted a video
// from (#21), as the browser reports it, for the evidence envelope; null otherwise.
export class FinalizeUploadRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    readonly originalFilename: string,
    readonly clientIp: string,
    readonly userAgent: string | undefined,
    readonly convertedFrom: ConvertedSource | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
