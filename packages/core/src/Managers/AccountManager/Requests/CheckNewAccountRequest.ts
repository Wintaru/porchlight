import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Whether a first sign-in at `email` would be let in (#68): the same rule EnsureProfile
// applies, asked before the sign-in link is sent, so a closed site mails no stranger.
// It says nothing about whether the address already has an account. `inviteToken` is
// the invite link the visitor came in through, if any (#25): it is checked, not spent.
export class CheckNewAccountRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly inviteToken: string | null = null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
