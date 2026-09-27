import type { EmailPreference } from "../../Common/EmailPreference";
import type { MemberEmailClaim } from "../../Common/MemberEmailClaim";

// The fake's `email_preferences`. It has no notifications or accounts to join, so what
// the sweep would find due is set up front in `due`: a claim hands those out once, and
// a release puts one back. `tokens` maps an unsubscribe token to its member. `failing`
// makes every call answer EmailPreferenceAccessFailedResponse, for the error path.
export class FakeEmailPreferenceState {
  readonly preferences = new Map<string, EmailPreference>();
  readonly tokens = new Map<string, string>();
  due: MemberEmailClaim[] = [];
  readonly released: MemberEmailClaim[] = [];

  constructor(readonly failing = false) {}
}
