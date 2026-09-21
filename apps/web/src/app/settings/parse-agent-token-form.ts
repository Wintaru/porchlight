import {
  AGENT_SCOPES,
  AGENT_TOKEN_NAME_MAX_LENGTH,
  type AgentScope,
  DEFAULT_AGENT_SCOPES,
} from "@porchlight/core";

// The edge of the mint form (SPEC.md §17): a name, the scope checkboxes, and an expiry
// chosen from a short list of days. The Manager validates again; this only turns the
// form's strings into the request's shape.
export const EXPIRY_CHOICES = ["never", "30", "90", "365"] as const;
export type ExpiryChoice = (typeof EXPIRY_CHOICES)[number];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AgentTokenFormValues {
  readonly name: string;
  readonly scopes: readonly AgentScope[];
  readonly expiresAt: Date | null;
}

export type AgentTokenFormResult =
  | { readonly ok: true; readonly values: AgentTokenFormValues }
  | { readonly ok: false; readonly error: "name" | "scopes" | "expiry" };

export function parseAgentTokenForm(formData: FormData, now: Date): AgentTokenFormResult {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name === "" || name.length > AGENT_TOKEN_NAME_MAX_LENGTH) {
    return { ok: false, error: "name" };
  }
  const scopes = formData
    .getAll("scopes")
    .filter((value): value is AgentScope =>
      AGENT_SCOPES.some((scope) => scope === value),
    );
  if (scopes.length !== formData.getAll("scopes").length) {
    return { ok: false, error: "scopes" };
  }
  const expiry = formData.get("expiry");
  if (!EXPIRY_CHOICES.some((choice) => choice === expiry)) {
    return { ok: false, error: "expiry" };
  }
  return {
    ok: true,
    values: {
      name,
      // A form with no box ticked still gets the draft scope: the floor, not a choice.
      scopes: scopes.length === 0 ? DEFAULT_AGENT_SCOPES : scopes,
      expiresAt:
        expiry === "never" ? null : new Date(now.getTime() + Number(expiry) * DAY_MS),
    },
  };
}
