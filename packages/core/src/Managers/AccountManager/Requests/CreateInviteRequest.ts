import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { InviteTerms } from "../InviteTerms";

// An admin makes an invite link (#25).
export class CreateInviteRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly terms: InviteTerms,
    context?: RequestContext,
  ) {
    super(context);
  }
}
