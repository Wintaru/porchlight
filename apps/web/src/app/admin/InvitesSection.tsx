import {
  type Actor,
  GetInvitesRequest,
  type Invite,
  InvitesResponse,
  type SignUpPolicy,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

import { revokeInvite } from "./invite-actions";
import { MakeInviteForm } from "./MakeInviteForm";
import styles from "./admin.module.css";

interface InvitesSectionProps {
  readonly actor: Actor;
  readonly signUp: SignUpPolicy;
}

// `live` comes from the database's rule (#92): the page does not judge a link by its own
// clock.
function describe(invite: Invite): string {
  const uses =
    invite.maxUses === null
      ? `${String(invite.usedCount)} joined`
      : `${String(invite.usedCount)} of ${String(invite.maxUses)} joined`;
  if (invite.revokedAt !== null) {
    return `${uses} · revoked`;
  }
  if (!invite.live) {
    return `${uses} · no longer works`;
  }
  return invite.expiresAt === null
    ? `${uses} · works until revoked`
    : `${uses} · works until ${invite.expiresAt.toISOString().slice(0, 10)}`;
}

// Invite links (#25): with `sign_up` set to `invite`, a friend joins only through one.
export async function InvitesSection({ actor, signUp }: InvitesSectionProps) {
  const response = await getDependencyContainer().accountManager.query(
    new GetInvitesRequest(actor),
  );
  const invites = response instanceof InvitesResponse ? response.invites : undefined;
  return (
    <section id="invites" className={styles.card} aria-labelledby="invites-heading">
      <h2 id="invites-heading">Invite links</h2>
      <p className="form-hint">
        {signUp === "invite"
          ? "Sign-up is by invite: a new person joins only through one of these links."
          : `Sign-up is ${signUp}, so links make no difference now. They work once sign-up is set to invite.`}
      </p>
      <MakeInviteForm />
      {invites === undefined ? (
        <p role="alert" className="form-alert">
          The links could not be loaded. Try again in a moment.
        </p>
      ) : invites.length === 0 ? (
        <p className={styles.muted}>No links yet.</p>
      ) : (
        <ul data-testid="invite-list">
          {invites.map((invite) => (
            <li key={invite.id} data-testid="invite-row">
              Made {invite.createdAt.toISOString().slice(0, 10)} · joins as{" "}
              {invite.trustLevel} · {describe(invite)}{" "}
              {invite.revokedAt === null && (
                <form action={revokeInvite} style={{ display: "inline" }}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="pill-button">
                    Revoke
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
