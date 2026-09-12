import type { Actor } from "../../../Common/Actor";
import type { AnonymousSubmission } from "../../../Common/AnonymousSubmission";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A visitor requests a place to put an image alongside an anonymous post or comment
// (SPEC.md §4, §6). Runs through the same D15 admission guard a post or comment does.
export class RequestUploadUrlAnonymouslyRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly originalFilename: string,
    readonly declaredBytes: number,
    readonly submission: AnonymousSubmission,
    context?: RequestContext,
  ) {
    super(context);
  }
}
