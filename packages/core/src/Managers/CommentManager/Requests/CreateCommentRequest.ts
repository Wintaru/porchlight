import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { CommentDraft } from "../CommentDraft";

// A member comments on a post or answers a comment. Lands `visible` for a trusted
// member or staff, `pending` for a member on probation (SPEC.md §4).
export class CreateCommentRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly draft: CommentDraft,
    context?: RequestContext,
  ) {
    super(context);
  }
}
