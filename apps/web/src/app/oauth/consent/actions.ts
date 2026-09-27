"use server";

import {
  type Actor,
  type AgentScope,
  agentsOpenTo,
  GrantOAuthClientRequest,
  OAuthClientGrantedResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { decideAuthorization, loadAuthorization } from "@/auth/oauth-consent";
import { getAgentsPolicy } from "@/lib/agents-policy";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { type ConsentError, consentPath, parseConsentForm } from "./parse-consent-form";

type Member = Extract<Actor, { kind: "member" }>;

// The consent page's one Server Function (D25). Approve stores the grant first and
// tells Auth second: a grant with no code behind it is harmless, but a code with no
// grant behind it would give the client a token the door refuses.
export async function decideConsent(formData: FormData): Promise<void> {
  const parsed = parseConsentForm(formData);
  if (!parsed.ok) {
    redirect(
      parsed.authorizationId === undefined
        ? "/oauth/consent"
        : consentPath(parsed.authorizationId, "form"),
    );
  }
  const { decision } = parsed;
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(consentPath(decision.authorizationId)));
  }

  if (decision.kind === "approve") {
    const refusal = await storeGrant(actor, decision.authorizationId, decision.scopes);
    if (refusal !== undefined) {
      redirect(consentPath(decision.authorizationId, refusal));
    }
  }
  const back = await decideAuthorization(decision.authorizationId, decision.kind);
  if (back === undefined) {
    redirect(consentPath(decision.authorizationId, "expired"));
  }
  redirect(back);
}

// Asks Auth which client this authorization is for, and stores the member's scopes for
// that client. Answers the error to show, or undefined once the grant is stored.
async function storeGrant(
  actor: Member,
  authorizationId: string,
  scopes: readonly AgentScope[],
): Promise<ConsentError | undefined> {
  const lookup = await loadAuthorization(authorizationId);
  // Already approved at Auth: the grant from that approval stands, and deciding again
  // fails below as expired, which is what the page then says.
  if (lookup.kind !== "consent" || lookup.pending.userId !== actor.profile.id) {
    return "expired";
  }
  if (!agentsOpenTo(actor.profile, await getAgentsPolicy())) {
    return "closed";
  }
  const { clientId, clientName } = lookup.pending;
  const response = await getDependencyContainer().accountManager.execute(
    new GrantOAuthClientRequest(actor, clientId, clientName, scopes),
  );
  if (response instanceof OAuthClientGrantedResponse) {
    return undefined;
  }
  console.error(`oauth grant failed [${response.correlationId}]`, response);
  return "unavailable";
}
