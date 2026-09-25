"use client";

import type { AgentScope } from "@porchlight/core";
import { useActionState } from "react";

import { EXPIRY_CHOICES, type ExpiryChoice } from "./parse-agent-token-form";
import { type MintState, mintAgentToken } from "./agent-actions";
import styles from "./settings.module.css";

const SCOPE_TEXT: Readonly<Record<AgentScope, string>> = {
  "posts:draft": "Write drafts (you publish from the editor)",
  "posts:publish": "Publish without you",
  "media:upload": "Upload images (arrives with issue #31)",
  "voice:write": "Change your voice guide",
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
interface MintTokenFormProps {
  // Handed down by the server parent: a client component takes only types from the
  // core, never values, so the core's server-only modules stay out of the browser.
  readonly scopes: readonly AgentScope[];
}

export function MintTokenForm({ scopes }: MintTokenFormProps) {
  const [state, formAction, pending] = useActionState(mintAgentToken, IDLE);

  if (state.kind === "minted") {
    return (
      <div className={styles.secret} data-testid="minted-token">
        <p role="status" className="form-status">
          Copy this token now. It is shown once and never again.
        </p>
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
    <form action={formAction} className={styles.form} data-testid="mint-token-form">
      {state.kind === "error" && (
        <p role="alert" className="form-alert" data-testid="mint-token-error">
          {state.error}
        </p>
      )}
      <label className="field">
        <span className="field-label">Token name</span>
        <input
          className="text-input"
          type="text"
          name="name"
          maxLength={60}
          required
          placeholder="Laptop"
        />
      </label>
      <fieldset className={styles.scopes}>
        <legend className="field-label">Scopes</legend>
        {scopes.map((scope) => (
          <label key={scope} className="check">
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
      <label className="field">
        <span className="field-label">Expires</span>
        <select className="text-input" name="expiry" defaultValue="never">
          {EXPIRY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {EXPIRY_TEXT[choice]}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button
          type="submit"
          className="pill-button pill-button--amber"
          disabled={pending}
        >
          Mint token
        </button>
      </div>
    </form>
  );
}
