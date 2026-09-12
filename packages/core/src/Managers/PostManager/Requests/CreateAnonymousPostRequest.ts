import type { AnonymousSubmission } from "../../../Common/AnonymousSubmission";
import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { AnonymousPostDraft } from "../AnonymousPostDraft";

// A visitor writes without an account (D7). The row starts and stays `pending`: there
// is no draft phase to write into later, since the author has no session to come back
// with except through the claim flow.
export class CreateAnonymousPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly draft: AnonymousPostDraft,
    readonly submission: AnonymousSubmission,
    context?: RequestContext,
  ) {
    super(context);
  }
}
