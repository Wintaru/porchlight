import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SignInIdentity } from "../SignInIdentity";

// Runs after every sign-in. Creates the profile on the first one, with `member` and
// `probation`, or `admin` and `trusted` for the first profile ever or the configured
// admin email. Answers the existing profile on every later sign-in.
export class EnsureProfileRequest extends RequestBase {
  constructor(
    readonly identity: SignInIdentity,
    context?: RequestContext,
  ) {
    super(context);
  }
}
