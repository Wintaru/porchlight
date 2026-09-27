import type { Invite } from "../../Common/Invite";

// The fake's `invites`: each link with its token hash. `failing` makes every call
// answer InviteAccessFailedResponse, for the error path.
export class FakeInviteState {
  readonly invites = new Map<string, { readonly tokenHash: string; invite: Invite }>();

  constructor(readonly failing = false) {}
}
