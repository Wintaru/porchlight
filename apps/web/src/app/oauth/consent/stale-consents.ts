import {
  type Actor,
  isAgentTokenLive,
  ListAgentTokensRequest,
  TokensResponse,
} from "@porchlight/core";

import { listConsentedClients, withdrawOAuthConsent } from "@/auth/oauth-consent";
import { getDependencyContainer } from "@/lib/dependency-container";

// Auth approves a client again without asking when the member consented before, and
// then sends no one to this page. If Porchlight has no live grant for that client (the
// member revoked it, and withdrawing the consent at Auth failed then), every token the
// client gets would meet a closed door and the member could never choose again. So,
// on an automatic approval, withdraw at Auth every consent that has no live grant here.
// Answers whether it withdrew any: the member must then start again from the app,
// which now shows them this page.
export async function withdrawStaleConsents(
  actor: Extract<Actor, { kind: "member" }>,
): Promise<boolean> {
  const [listed, consented] = await Promise.all([
    getDependencyContainer().accountManager.query(new ListAgentTokensRequest(actor)),
    listConsentedClients(),
  ]);
  if (!(listed instanceof TokensResponse) || consented === undefined) {
    // Cannot tell which consent is stale: leave them, and let the approval stand.
    return false;
  }
  const now = new Date();
  const live = new Set(
    listed.tokens
      .filter((token) => isAgentTokenLive(token, now))
      .map((token) => token.oauthClientId)
      .filter((clientId) => clientId !== null),
  );
  const stale = consented.filter((clientId) => !live.has(clientId));
  await Promise.all(stale.map((clientId) => withdrawOAuthConsent(clientId)));
  return stale.length > 0;
}
