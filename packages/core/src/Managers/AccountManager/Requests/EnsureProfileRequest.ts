import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SignInIdentity } from "../SignInIdentity";

// Runs after every sign-in. Creates the profile on the first one, with `member` and
// `probation`, or `admin` and `trusted` for the configured admin email (or, with none
// configured, the first profile ever). Answers the existing profile on every later
// sign-in. `inviteToken` is the link a friend came in through (#25): on an invite-only
// site it is what lets a new account in, at the trust level the link grants.
export class EnsureProfileRequest extends RequestBase {
  constructor(
    readonly identity: SignInIdentity,
    readonly inviteToken: string | null = null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
