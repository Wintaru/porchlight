import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { RequestOrigin } from "../../../Common/RequestOrigin";
import type { PostDraft } from "../PostDraft";

// A member starts a post. The slug comes from the title, the HTML from the body, and
// the row starts as `draft` whatever the member's trust. `origin` goes into the post's
// evidence envelope (SPEC.md §7).
export class CreateDraftRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly draft: PostDraft,
    readonly origin: RequestOrigin,
    context?: RequestContext,
  ) {
    super(context);
  }
}
