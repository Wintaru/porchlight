import { agentsOpenTo } from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAgentsPolicy } from "@/lib/agents-policy";
import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { classNames } from "@/lib/class-names";
import { saveProfile } from "./actions";
import { AnonymousClaimCard } from "./AnonymousClaimCard";
import { AgentsSection } from "./AgentsSection";
import styles from "./settings.module.css";
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

// The Settings board: a side menu and one card per section — profile, agents (when
// the site's `agents` key allows them, D22), anonymous posts to claim, export, erase.
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
  const agentsOpen = agentsOpenTo(profile, agentsPolicy);
  const sections = [
    { id: "profile", label: "Profile" },
    ...(agentsOpen ? [{ id: "agents", label: "Agents" }] : []),
    { id: "anonymous", label: "Anonymous posts" },
    { id: "data", label: "Your data" },
    { id: "erase", label: "Erase everything" },
  ];
  return (
    <main className={styles.layout}>
      <nav aria-label="Settings sections" className={styles.side}>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.content}>
        <h1 className={styles.title}>Settings</h1>
        <section id="profile" className={styles.card} aria-labelledby="profile-heading">
          <h2 id="profile-heading">Profile</h2>
          {saved !== undefined && (
            <p role="status" className="form-status" data-testid="form-status">
              Saved.
            </p>
          )}
          {errorText !== undefined && (
            <p role="alert" className="form-alert" data-testid="form-error">
              {errorText}
            </p>
          )}
          <form action={saveProfile} className={styles.form}>
            <div className={styles.pair}>
              <label className="field">
                <span className="field-label">Display name</span>
                <input
                  className="text-input"
                  type="text"
                  name="displayName"
                  defaultValue={profile.displayName ?? ""}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                />
              </label>
              <label className="field">
                <span className="field-label">Handle</span>
                <input
                  className="text-input"
                  type="text"
                  name="handle"
                  defaultValue={profile.handle}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Bio</span>
              <textarea
                className="text-input"
                name="bio"
                defaultValue={profile.bio ?? ""}
                maxLength={BIO_MAX_LENGTH}
              />
            </label>
            <p className="form-hint">
              {profile.role === "member"
                ? TRUST_TEXT[profile.trustLevel]
                : `Role: ${profile.role}.`}
            </p>
            <div>
              <button type="submit" className="pill-button pill-button--amber">
                Save
              </button>
            </div>
          </form>
        </section>
        {agentsOpen && (
          <AgentsSection
            actor={actor}
            revoked={agentRevoked !== undefined}
            errorText={agentErrorText}
          />
        )}
        <AnonymousClaimCard handle={profile.handle} />
        <section id="data" className={styles.card} aria-labelledby="data-heading">
          <h2 id="data-heading">Your data</h2>
          <p>Everything you have written is yours. Take a copy any time.</p>
          <div>
            <Link className="pill-button" href="/settings/export">
              Export as markdown + JSON
            </Link>
          </div>
          <p className="form-hint">
            Includes your posts, comments, reactions and uploads. Ready in a minute. No
            waiting period, no support ticket.
          </p>
        </section>
        <section
          id="erase"
          className={classNames(styles.card, styles.danger)}
          aria-labelledby="erase-heading"
        >
          <h2 id="erase-heading">Erase everything</h2>
          <p>
            Deletes every post, comment, reaction and upload you made, and your profile.
            It is gone from the database and from storage, not hidden.
          </p>
          <div className={styles.row}>
            <Link className="pill-button" href="/settings/export">
              Export first
            </Link>
            <Link className="pill-button pill-button--danger" href="/settings/erase">
              Erase everything I contributed
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
