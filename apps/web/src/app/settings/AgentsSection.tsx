import {
  type Actor,
  type AgentToken,
  type AgentsPolicy,
  ListAgentTokensRequest,
  TokensResponse,
  agentsOpenTo,
  isAgentTokenLive,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";
import { revokeAgentToken } from "./agent-actions";
import { MintTokenForm } from "./MintTokenForm";

interface AgentsSectionProps {
  readonly actor: Extract<Actor, { kind: "member" }>;
  readonly policy: AgentsPolicy;
  readonly revoked: boolean;
  readonly errorText: string | undefined;
}

// The Agents section of the settings page (SPEC.md §17): mint, the list with last
// used, revoke. Hidden when the site's `agents` key closes agents to this member.
export async function AgentsSection({
  actor,
  policy,
  revoked,
  errorText,
}: AgentsSectionProps) {
  if (!agentsOpenTo(actor.profile, policy)) {
    return null;
  }
  const response = await getDependencyContainer().accountManager.query(
    new ListAgentTokensRequest(actor),
  );
  const tokens = response instanceof TokensResponse ? response.tokens : undefined;
  const now = new Date();

  return (
    <section aria-labelledby="agents-heading" data-testid="agents-section">
      <h2 id="agents-heading">Agents</h2>
      <p>
        A personal token lets your own writing agent draft posts here as you. Drafts wait
        for you in the editor unless you also grant publishing.
      </p>
      {revoked && (
        <p role="status" data-testid="agent-status">
          Token revoked.
        </p>
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="agent-error">
          {errorText}
        </p>
      )}
      <MintTokenForm />
      <h3>Your tokens</h3>
      {tokens === undefined ? (
        <p role="alert">Your tokens could not be listed right now.</p>
      ) : tokens.length === 0 ? (
        <p data-testid="tokens-empty">No tokens yet.</p>
      ) : (
        <ul>
          {tokens.map((token) => (
            <li key={token.id} data-testid="token-row">
              <span data-testid="token-name">{token.name}</span> ·{" "}
              {token.scopes.join(", ")} · {describe(token, now)}
              {isAgentTokenLive(token, now) && (
                <form action={revokeAgentToken}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <button type="submit" data-testid="token-revoke">
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

function describe(token: AgentToken, now: Date): string {
  if (token.revokedAt !== null) {
    return `revoked ${token.revokedAt.toISOString().slice(0, 10)}`;
  }
  if (token.expiresAt !== null && !isAgentTokenLive(token, now)) {
    return `expired ${token.expiresAt.toISOString().slice(0, 10)}`;
  }
  const lastUsed =
    token.lastUsedAt === null
      ? "never used"
      : `last used ${token.lastUsedAt.toISOString().slice(0, 10)}`;
  const expires =
    token.expiresAt === null
      ? ""
      : `, expires ${token.expiresAt.toISOString().slice(0, 10)}`;
  return `${lastUsed}${expires}`;
}
