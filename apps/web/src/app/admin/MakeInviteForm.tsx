"use client";

import { useActionState } from "react";

import { type MakeInviteState, makeInvite } from "./invite-actions";
import styles from "./admin.module.css";

const IDLE: MakeInviteState = { kind: "idle" };

// The form and, once, the link it made (#25).
export function MakeInviteForm() {
  const [state, formAction, pending] = useActionState(makeInvite, IDLE);
  return (
    <div className="form-stack">
      {state.kind === "made" && (
        <div data-testid="invite-made">
          <p role="status" className="form-status">
            Copy this link now and send it to your friend. It is shown once.
          </p>
          <pre>
            <code data-testid="invite-link">{state.link}</code>
          </pre>
        </div>
      )}
      {state.kind === "error" && (
        <p role="alert" className="form-alert" data-testid="invite-error">
          {state.error}
        </p>
      )}
      <form action={formAction} className={styles.grid} data-testid="invite-form">
        <label className="field">
          <span className="field-label">Joins as</span>
          <select className="text-input" name="trustLevel" defaultValue="trusted">
            <option value="trusted">Trusted (posts go out at once)</option>
            <option value="probation">On probation (posts wait for approval)</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Link works for</span>
          <select className="text-input" name="expiresInDays" defaultValue="7">
            <option value="1">One day</option>
            <option value="7">One week</option>
            <option value="30">30 days</option>
            <option value="">Until revoked</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">People it lets in</span>
          <select className="text-input" name="maxUses" defaultValue="1">
            <option value="1">One</option>
            <option value="5">Five</option>
            <option value="25">25</option>
            <option value="">No limit</option>
          </select>
        </label>
        <div>
          <button
            type="submit"
            className="pill-button pill-button--amber"
            disabled={pending}
          >
            Make an invite link
          </button>
        </div>
      </form>
    </div>
  );
}
