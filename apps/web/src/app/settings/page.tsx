import Link from "next/link";
import { redirect } from "next/navigation";

import { getAgentsPolicy } from "@/lib/agents-policy";
import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { saveProfile } from "./actions";
import { AgentsSection } from "./AgentsSection";
import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH } from "./parse-profile-form";

interface SettingsPageProps {
  readonly searchParams: Promise<{
    readonly saved?: string;
    readonly error?: string;
    readonly agentRevoked?: string;
    readonly agentError?: string;
  }>;
}

const ERROR_TEXT: Readonly<Record<string, string>> = {
  "handle-shape":
    "A handle is 2 to 30 characters: lowercase letters, digits, - and _, starting with a letter or digit.",
  "handle-reserved": "That handle is reserved.",
  "handle-taken": "That handle is already someone's.",
  "display-name-length": `A display name is at most ${String(DISPLAY_NAME_MAX_LENGTH)} characters.`,
  "bio-length": `A bio is at most ${String(BIO_MAX_LENGTH)} characters.`,
  forbidden: "This account cannot change its profile right now.",
  unavailable: "The profile could not be saved. Try again in a moment.",
};

const AGENT_ERROR_TEXT: Readonly<Record<string, string>> = {
  "no-such-token": "That token is not one of yours.",
  forbidden: "This account cannot change its tokens right now.",
  unavailable: "The token could not be changed. Try again in a moment.",
};

const TRUST_TEXT = {
  probation: "On probation: posts and comments wait for approval.",
  trusted: "Trusted member: posts and comments publish at once.",
} as const;

// The Profile section of the Settings board. Unstyled until issue #16 lands the tokens.
export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const { profile } = actor;
  const { saved, error, agentRevoked, agentError } = await searchParams;
  const errorText =
    error === undefined ? undefined : (ERROR_TEXT[error] ?? ERROR_TEXT.unavailable);
  const agentErrorText =
    agentError === undefined
      ? undefined
      : (AGENT_ERROR_TEXT[agentError] ?? AGENT_ERROR_TEXT.unavailable);
  const agentsPolicy = await getAgentsPolicy();
  return (
    <main>
      <h1>Settings</h1>
      <h2>Profile</h2>
      {saved !== undefined && (
        <p role="status" data-testid="form-status">
          Saved.
        </p>
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}
      <form action={saveProfile}>
        <label>
          Display name
          <input
            type="text"
            name="displayName"
            defaultValue={profile.displayName ?? ""}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
          />
        </label>
        <label>
          Handle
          <input type="text" name="handle" defaultValue={profile.handle} required />
        </label>
        <label>
          Bio
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={BIO_MAX_LENGTH}
          />
        </label>
        <p>
          {profile.role === "member"
            ? TRUST_TEXT[profile.trustLevel]
            : `Role: ${profile.role}.`}
        </p>
        <button type="submit">Save</button>
      </form>
      <AgentsSection
        actor={actor}
        policy={agentsPolicy}
        revoked={agentRevoked !== undefined}
        errorText={agentErrorText}
      />
      <h2>Your data</h2>
      <p>Everything you have written is yours. Take a copy any time.</p>
      <Link href="/settings/export">Export as markdown + JSON</Link>
      <p>
        Includes your posts, comments, reactions and uploads. Ready in a minute. No
        waiting period, no support ticket.
      </p>
      <h2>Erase everything</h2>
      <p>
        Deletes every post, comment, reaction and upload you made, and your profile. It is
        gone from the database and from storage, not hidden.
      </p>
      <Link href="/settings/erase">Erase everything I contributed</Link>
    </main>
  );
}
