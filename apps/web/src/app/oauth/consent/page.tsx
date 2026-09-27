import { AGENT_SCOPES, agentsOpenTo } from "@porchlight/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadAuthorization } from "@/auth/oauth-consent";
import { SimplePage } from "@/components/SimplePage";
import { AGENT_SCOPE_TEXT } from "@/lib/agent-scopes";
import { getAgentsPolicy } from "@/lib/agents-policy";
import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { decideConsent } from "./actions";
import { type ConsentError, consentPath, isConsentError } from "./parse-consent-form";
import { withdrawStaleConsents } from "./stale-consents";
import styles from "./consent.module.css";

export const metadata: Metadata = {
  title: "Connect an app",
  robots: { index: false },
};

interface ConsentPageProps {
  readonly searchParams: Promise<{
    readonly authorization_id?: string;
    readonly error?: string;
  }>;
}

const ERROR_TEXT: Readonly<Record<ConsentError, string>> = {
  form: "Pick scopes from the list.",
  unavailable: "Your choice could not be saved. Try again in a moment.",
  expired: "This request has expired or was already answered. Start again from the app.",
  closed: "Agents are turned off on this site, or off for this account.",
};

const RECONNECT_TEXT =
  "Access for this app was taken back earlier. Start again from the app to choose what it may do.";

// Where Supabase Auth sends a member when an app such as a claude.ai connector asks to
// act for them (D25, SPEC.md §17). The member reads who is asking, picks what it may
// do, and approves or denies. What they pick is stored as a grant, the same scopes a
// personal token has; Auth only issues the token.
export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const { authorization_id: authorizationId, error } = await searchParams;
  if (authorizationId === undefined || authorizationId === "") {
    return <Unusable text="This link is not complete. Start again from the app." />;
  }
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(consentPath(authorizationId)));
  }

  const lookup = await loadAuthorization(authorizationId);
  if (lookup.kind === "redirect") {
    // Approved before, and Auth approved again without asking. Send the member back,
    // unless that consent had no grant here behind it (stale-consents.ts).
    if (await withdrawStaleConsents(actor)) {
      return <Unusable text={RECONNECT_TEXT} />;
    }
    redirect(lookup.url);
  }
  if (lookup.kind === "invalid" || lookup.pending.userId !== actor.profile.id) {
    return <Unusable text={ERROR_TEXT.expired} />;
  }
  const { pending } = lookup;
  const open = agentsOpenTo(actor.profile, await getAgentsPolicy());
  const message = isConsentError(error) ? ERROR_TEXT[error] : undefined;

  return (
    <SimplePage
      title="Connect an app"
      lead={
        <>
          <strong data-testid="consent-client-name">{pending.clientName}</strong> wants to
          write on Porchlight as @{actor.profile.handle}.
        </>
      }
    >
      <form action={decideConsent} className="card form-stack" data-testid="consent-form">
        {message !== undefined && (
          <p className="form-alert" role="alert" data-testid="consent-error">
            {message}
          </p>
        )}
        <input type="hidden" name="authorization_id" value={pending.authorizationId} />
        <p className={styles.muted}>
          After you answer, it sends you back to{" "}
          <code data-testid="consent-redirect">{hostOf(pending.redirectUri)}</code>. You
          can take this back at any time in Settings, section Agents.
        </p>
        {open ? (
          <fieldset className={styles.scopes}>
            <legend className="field-label">What it may do</legend>
            {AGENT_SCOPES.map((scope) => (
              <label key={scope} className="check">
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  defaultChecked={scope === "posts:draft"}
                  disabled={scope === "posts:draft"}
                />
                {AGENT_SCOPE_TEXT[scope]}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="form-alert" role="alert" data-testid="consent-closed">
            {ERROR_TEXT.closed}
          </p>
        )}
        <div className={styles.actions}>
          {open && (
            <button
              type="submit"
              name="decision"
              value="approve"
              className="pill-button pill-button--amber"
            >
              Allow
            </button>
          )}
          <button type="submit" name="decision" value="deny" className="pill-button">
            Deny
          </button>
        </div>
      </form>
    </SimplePage>
  );
}

function Unusable({ text }: { readonly text: string }) {
  return (
    <SimplePage title="Connect an app">
      <p className="form-alert" role="alert" data-testid="consent-unusable">
        {text}
      </p>
    </SimplePage>
  );
}

// The member sees where they will land, not the full address with its path.
function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}
