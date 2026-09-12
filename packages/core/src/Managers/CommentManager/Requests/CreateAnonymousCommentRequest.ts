import type { Actor } from "../../../Common/Actor";
import type { AnonymousSubmission } from "../../../Common/AnonymousSubmission";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { CommentDraft } from "../CommentDraft";

// A visitor comments on a post or answers a comment (D7). Always lands `pending`: an
// anonymous author has no trust level to publish at once.
export class CreateAnonymousCommentRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly draft: CommentDraft,
    readonly submission: AnonymousSubmission,
    context?: RequestContext,
  ) {
    super(context);
  }
}
