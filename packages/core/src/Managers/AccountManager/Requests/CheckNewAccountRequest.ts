import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Whether a first sign-in at `email` would be let in (#68): the same rule EnsureProfile
// applies, asked before the sign-in link is sent, so a closed site mails no stranger.
// It says nothing about whether the address already has an account.
export class CheckNewAccountRequest extends RequestBase {
  constructor(
    readonly email: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
