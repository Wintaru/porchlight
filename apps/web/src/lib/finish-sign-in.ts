import { clearInviteToken, currentInviteToken } from "@/lib/invite-cookie";
import { type IdentityFields, toSessionUser } from "@/auth/session-user";
import { ensureProfileFor } from "@/lib/ensure-profile";

export const SIGN_IN_FAILED_PATH = "/auth/sign-in-failed";

// Only the sign-out the refusal paths need, so any session client fits.
interface SignOutClient {
  readonly auth: { signOut(): Promise<unknown> };
}

// The step every sign-in method shares once Supabase Auth has a session: create the
// profile on the first visit under the `sign_up` rule (with the invite cookie, #25), or drop the session when the
// profile is refused, so nobody is left signed in with no profile. Answers the failure
// page to go to, or `undefined` when the member is signed in.
export async function finishSignIn(
  client: SignOutClient,
  id: string,
  fields: IdentityFields,
): Promise<string | undefined> {
  const user = toSessionUser(id, fields);
  const outcome =
    user === undefined
      ? undefined
      : await ensureProfileFor(user, await currentInviteToken());
  if (outcome !== undefined && outcome !== "sign-up-closed") {
    // Signed in: an invite that let them in is spent, and one that was not needed has
    // done its job either way.
    await clearInviteToken();
    return undefined;
  }
  await client.auth.signOut();
  return outcome === "sign-up-closed"
    ? `${SIGN_IN_FAILED_PATH}?reason=sign-up-closed`
    : SIGN_IN_FAILED_PATH;
}
