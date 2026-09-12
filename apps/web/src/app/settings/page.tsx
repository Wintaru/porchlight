import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { saveProfile } from "./actions";
import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH } from "./parse-profile-form";

interface SettingsPageProps {
  readonly searchParams: Promise<{ readonly saved?: string; readonly error?: string }>;
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
  const { saved, error } = await searchParams;
  const errorText =
    error === undefined ? undefined : (ERROR_TEXT[error] ?? ERROR_TEXT.unavailable);
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
    </main>
  );
}
