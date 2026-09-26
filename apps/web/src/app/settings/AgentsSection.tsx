import {
  type Actor,
  AGENT_SCOPES,
  type AgentToken,
  GetVoiceGuideRequest,
  ListAgentTokensRequest,
  TokensResponse,
  VoiceGuideResponse,
  isAgentTokenLive,
} from "@porchlight/core";

import { Toast } from "@/components/toast/Toast";
import { getDependencyContainer } from "@/lib/dependency-container";
import { revokeAgentToken } from "./agent-actions";
import { MintTokenForm } from "./MintTokenForm";
import { VoiceGuideForm } from "./VoiceGuideForm";
import styles from "./settings.module.css";

interface AgentsSectionProps {
  readonly actor: Extract<Actor, { kind: "member" }>;
  readonly revoked: boolean;
  readonly voiceSaved: boolean;
  readonly errorText: string | undefined;
}

// The Agents card of the settings page (SPEC.md §17): mint, the list with last used,
// revoke. The page shows it only when the site's `agents` key opens agents to this
// member.
export async function AgentsSection({
  actor,
  revoked,
  voiceSaved,
  errorText,
}: AgentsSectionProps) {
  const { accountManager } = getDependencyContainer();
  const [response, voice] = await Promise.all([
    accountManager.query(new ListAgentTokensRequest(actor)),
    accountManager.query(new GetVoiceGuideRequest(actor)),
  ]);
  const tokens = response instanceof TokensResponse ? response.tokens : undefined;
  const guide = voice instanceof VoiceGuideResponse ? voice.guide : undefined;
  const now = new Date();

  return (
    <section
      id="agents"
      className={styles.card}
      aria-labelledby="agents-heading"
      data-testid="agents-section"
    >
      <h2 id="agents-heading">Agents</h2>
      <p>
        A personal token lets your own writing agent draft posts here as you. Drafts wait
        for you in the editor unless you also grant publishing.
      </p>
      {revoked && (
        <Toast message="Token revoked." param="agentRevoked" testId="agent-status" />
      )}
      {errorText !== undefined && (
        <p role="alert" className="form-alert" data-testid="agent-error">
          {errorText}
        </p>
      )}
      <MintTokenForm scopes={AGENT_SCOPES} />
      <h3>Your tokens</h3>
      {tokens === undefined ? (
        <p role="alert" className="form-alert">
          Your tokens could not be listed right now.
        </p>
      ) : tokens.length === 0 ? (
        <p className={styles.muted} data-testid="tokens-empty">
          No tokens yet.
        </p>
      ) : (
        <ul className={styles.tokens}>
          {tokens.map((token) => (
            <li key={token.id} className={styles.token} data-testid="token-row">
              <span>
                <strong data-testid="token-name">{token.name}</strong>{" "}
                <span className={styles.muted}>
                  · {token.scopes.join(", ")} · {describe(token, now)}
                </span>
              </span>
              {isAgentTokenLive(token, now) && (
                <form action={revokeAgentToken}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <button
                    type="submit"
                    className="pill-button"
                    data-testid="token-revoke"
                  >
                    Revoke
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <VoiceGuideForm guide={guide} saved={voiceSaved} />
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
