import { isAuthorizationId } from "./authorization-id";
import { createSessionClient } from "./session-client";

// Supabase Auth's OAuth server, from the consent page's side (D25). Auth sends the
// member to `/oauth/consent?authorization_id=…`; these calls run as the signed-in
// member (their session cookie), so Auth ties the decision to them. Only here does the
// app talk to the OAuth server; the decision about scopes is the AccountManager's.

export interface PendingAuthorization {
  readonly authorizationId: string;
  // Who Auth says is asking. The consent page stores its grant under this id, never
  // under one a form sends.
  readonly clientId: string;
  readonly clientName: string;
  readonly redirectUri: string;
  readonly userId: string;
}

export type AuthorizationLookup =
  | { readonly kind: "consent"; readonly pending: PendingAuthorization }
  // The member already approved this client, and Auth approved again without asking.
  | { readonly kind: "redirect"; readonly url: string }
  | { readonly kind: "invalid" };

export async function loadAuthorization(
  authorizationId: string,
): Promise<AuthorizationLookup> {
  if (!isAuthorizationId(authorizationId)) {
    return { kind: "invalid" };
  }
  const client = await createSessionClient();
  const { data, error } =
    await client.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error !== null) {
    console.error("oauth authorization lookup failed", error.message);
    return { kind: "invalid" };
  }
  if (!("authorization_id" in data)) {
    return { kind: "redirect", url: data.redirect_url };
  }
  return {
    kind: "consent",
    pending: {
      authorizationId: data.authorization_id,
      clientId: data.client.id,
      clientName: data.client.name,
      redirectUri: data.redirect_uri,
      userId: data.user.id,
    },
  };
}

// Tells Auth the member's answer and returns where to send the browser: back to the
// client with a code, or with `access_denied`. Undefined when Auth refused the call
// (an expired or already-used authorization).
export async function decideAuthorization(
  authorizationId: string,
  decision: "approve" | "deny",
): Promise<string | undefined> {
  if (!isAuthorizationId(authorizationId)) {
    return undefined;
  }
  const client = await createSessionClient();
  const options = { skipBrowserRedirect: true };
  const { data, error } =
    decision === "approve"
      ? await client.auth.oauth.approveAuthorization(authorizationId, options)
      : await client.auth.oauth.denyAuthorization(authorizationId, options);
  if (error !== null) {
    console.error(`oauth ${decision} failed`, error.message);
    return undefined;
  }
  return data.redirect_url;
}

// Withdraws the member's consent at Auth when they revoke a grant in settings. Without
// it Auth would approve the client again silently, and every token it got would meet a
// revoked grant at the door. Porchlight's own revoke is the wall; this keeps Auth in
// step, so a failure is logged, not shown.
export async function withdrawOAuthConsent(clientId: string): Promise<void> {
  try {
    const client = await createSessionClient();
    const { error } = await client.auth.oauth.revokeGrant({ clientId });
    if (error !== null) {
      console.error("oauth consent withdrawal failed", error.message);
    }
  } catch (error: unknown) {
    // The member's revoke has already happened here; a throw must not turn it into an
    // error page. The consent page heals a consent left behind (listConsentedClients).
    console.error("oauth consent withdrawal failed", error);
  }
}

// The clients the member has consented to at Auth, or undefined when Auth cannot say.
export async function listConsentedClients(): Promise<readonly string[] | undefined> {
  const client = await createSessionClient();
  const { data, error } = await client.auth.oauth.listGrants();
  if (error !== null) {
    console.error("oauth consent list failed", error.message);
    return undefined;
  }
  return data.map((grant) => grant.client.id);
}
