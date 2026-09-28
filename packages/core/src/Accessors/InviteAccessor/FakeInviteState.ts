import type { Invite } from "../../Common/Invite";

// The fake's `invites`: each link with its token hash. `failing` makes every call
// answer InviteAccessFailedResponse, for the error path. A row keeps no `live`: like
// the computed column, it is worked out when the row is read.
export class FakeInviteState {
  readonly invites = new Map<
    string,
    { readonly tokenHash: string; invite: Omit<Invite, "live"> }
  >();

  constructor(readonly failing = false) {}

  // The fake's copy of SQL `invite_is_live` (#92), by the request clock. The app has no
  // other copy: only the fake needs one, because it has no database.
  isLive(invite: Omit<Invite, "live">, now: Date): boolean {
    return (
      invite.revokedAt === null &&
      (invite.expiresAt === null || invite.expiresAt > now) &&
      (invite.maxUses === null || invite.usedCount < invite.maxUses)
    );
  }

  // A row as a read answers it, with `live` at `now`.
  read(invite: Omit<Invite, "live">, now: Date): Invite {
    return { ...invite, live: this.isLive(invite, now) };
  }
}
