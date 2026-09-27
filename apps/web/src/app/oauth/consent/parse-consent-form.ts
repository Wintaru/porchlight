import type { AgentScope } from "@porchlight/core/client";

import { isAuthorizationId } from "@/auth/authorization-id";
import { parseScopeChoices } from "@/lib/agent-scopes";

// The edge of the consent form (D25): which authorization, approve or deny, and the
// scopes ticked. The client id is not in the form on purpose: the action asks Auth who
// is asking, so a tampered form cannot grant scopes to a different client.
export type ConsentDecision =
  | {
      readonly kind: "approve";
      readonly authorizationId: string;
      readonly scopes: readonly AgentScope[];
    }
  | { readonly kind: "deny"; readonly authorizationId: string };

export type ConsentFormResult =
  | { readonly ok: true; readonly decision: ConsentDecision }
  | { readonly ok: false; readonly authorizationId: string | undefined };

export function parseConsentForm(formData: FormData): ConsentFormResult {
  const rawId = formData.get("authorization_id");
  const authorizationId =
    typeof rawId === "string" && isAuthorizationId(rawId) ? rawId : undefined;
  if (authorizationId === undefined) {
    return { ok: false, authorizationId: undefined };
  }
  const decision = formData.get("decision");
  if (decision === "deny") {
    return { ok: true, decision: { kind: "deny", authorizationId } };
  }
  if (decision !== "approve") {
    return { ok: false, authorizationId };
  }
  const scopes = parseScopeChoices(formData);
  if (scopes === undefined) {
    return { ok: false, authorizationId };
  }
  return { ok: true, decision: { kind: "approve", authorizationId, scopes } };
}

// Where the consent page lives, for a redirect back to it: the sign-in `next`, and an
// error to show.
export function consentPath(authorizationId: string, error?: ConsentError): string {
  const query = new URLSearchParams({ authorization_id: authorizationId });
  if (error !== undefined) {
    query.set("error", error);
  }
  return `/oauth/consent?${query.toString()}`;
}

export const CONSENT_ERRORS = ["form", "unavailable", "expired", "closed"] as const;
export type ConsentError = (typeof CONSENT_ERRORS)[number];

export function isConsentError(value: unknown): value is ConsentError {
  return CONSENT_ERRORS.some((error) => error === value);
}
