"use client";

import { AGENT_SCOPES, type AgentScope } from "@porchlight/core";
import { useActionState } from "react";

import { EXPIRY_CHOICES, type ExpiryChoice } from "./parse-agent-token-form";
import { type MintState, mintAgentToken } from "./agent-actions";

const SCOPE_TEXT: Readonly<Record<AgentScope, string>> = {
  "posts:draft": "Write drafts (you publish from the editor)",
  "posts:publish": "Publish without you",
  "media:upload": "Upload images (arrives with issue #31)",
  "voice:write": "Change your voice guide (arrives with issue #29)",
};

const EXPIRY_TEXT: Readonly<Record<ExpiryChoice, string>> = {
  never: "Never",
  "30": "30 days",
  "90": "90 days",
  "365": "One year",
};

const IDLE: MintState = { kind: "idle" };

// The mint form and, once, the token it produced (SPEC.md §17). `useActionState` keeps
// the raw token in this component's memory only: a reload clears it, and nothing on the
// server can show it again.
export function MintTokenForm() {
  const [state, formAction, pending] = useActionState(mintAgentToken, IDLE);

  if (state.kind === "minted") {
    return (
      <div data-testid="minted-token">
        <p role="status">Copy this token now. It is shown once and never again.</p>
        <pre>
          <code data-testid="minted-token-value">{state.rawToken}</code>
        </pre>
        <p>To connect Claude Code, run:</p>
        <pre>
          <code data-testid="mcp-add-line">{state.mcpAddLine}</code>
        </pre>
      </div>
    );
  }

  return (
    <form action={formAction} data-testid="mint-token-form">
      {state.kind === "error" && (
        <p role="alert" data-testid="mint-token-error">
          {state.error}
        </p>
      )}
      <label>
        Token name
        <input type="text" name="name" maxLength={60} required placeholder="Laptop" />
      </label>
      <fieldset>
        <legend>Scopes</legend>
        {AGENT_SCOPES.map((scope) => (
          <label key={scope}>
            <input
              type="checkbox"
              name="scopes"
              value={scope}
              defaultChecked={scope === "posts:draft"}
              disabled={scope === "posts:draft"}
            />
            {SCOPE_TEXT[scope]}
          </label>
        ))}
      </fieldset>
      <label>
        Expires
        <select name="expiry" defaultValue="never">
          {EXPIRY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {EXPIRY_TEXT[choice]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending}>
        Mint token
      </button>
    </form>
  );
}
