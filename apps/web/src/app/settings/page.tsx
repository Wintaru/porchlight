import { agentsOpenTo, VOICE_GUIDE_MAX_LENGTH } from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Toast } from "@/components/toast/Toast";
import { getAgentsPolicy } from "@/lib/agents-policy";
import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { classNames } from "@/lib/class-names";
import { saveProfile, saveProfileInPlace } from "./actions";
import { blockTextFor } from "@/components/member-block/block-messages";
import { AnonymousClaimCard } from "./AnonymousClaimCard";
import { MutedMembersSection } from "./MutedMembersSection";
import { AgentsSection } from "./AgentsSection";
import { EmailSection } from "./EmailSection";
import { PresenceSection } from "./PresenceSection";
import styles from "./settings.module.css";
import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH } from "./parse-profile-form";
import { type FormMessages, KeepTypedForm } from "@/components/KeepTypedForm";
import { pageTitle } from "@/lib/page-title";

interface SettingsPageProps {
  readonly searchParams: Promise<{
    readonly saved?: string;
    readonly error?: string;
    readonly agentRevoked?: string;
    readonly agentError?: string;
    readonly voiceSaved?: string;
    readonly block?: string;
    readonly emailSaved?: string;
    readonly emailError?: string;
    readonly presenceSaved?: string;
  }>;
}

const ERROR_TEXT: FormMessages = {
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
  unavailable: "The change could not be saved. Try again in a moment.",
  "voice-too-long": `A voice guide is at most ${VOICE_GUIDE_MAX_LENGTH.toLocaleString("en-US")} characters.`,
};

const EMAIL_ERROR_TEXT: Readonly<Record<string, string>> = {
  forbidden: "Only admins and moderators can get the moderation queue by email.",
  unavailable: "The email settings could not be saved. Try again in a moment.",
};

const TRUST_TEXT = {
  probation: "On probation: posts and comments wait for approval.",
  trusted: "Trusted member: posts and comments publish at once.",
} as const;

export function generateMetadata() {
  return pageTitle("Settings");
}

// The Settings board: a side menu and one card per section — profile, agents (when
// the site's `agents` key allows them, D22), email (#22), anonymous posts to claim,
// muted and blocked members (#23), export, erase.
export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const { profile } = actor;
  const {
    saved,
    error,
    agentRevoked,
    agentError,
    voiceSaved,
    block,
    emailSaved,
    emailError,
    presenceSaved,
  } = await searchParams;
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
    { id: "email", label: "Email" },
    { id: "presence", label: "Presence" },
    { id: "anonymous", label: "Anonymous posts" },
    { id: "muted", label: "Muted and blocked" },
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
            <Toast message="Saved." param="saved" testId="form-status" />
          )}
          {errorText !== undefined && (
            <p role="alert" className="form-alert" data-testid="form-error">
              {errorText}
            </p>
          )}
          <KeepTypedForm
            action={saveProfile}
            submitInPlace={saveProfileInPlace}
            messages={ERROR_TEXT}
            className={styles.form}
          >
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
          </KeepTypedForm>
        </section>
        {agentsOpen && (
          <AgentsSection
            actor={actor}
            revoked={agentRevoked !== undefined}
            voiceSaved={voiceSaved !== undefined}
            errorText={agentErrorText}
          />
        )}
        <EmailSection
          actor={actor}
          saved={emailSaved !== undefined}
          errorText={
            emailError === undefined
              ? undefined
              : (EMAIL_ERROR_TEXT[emailError] ?? EMAIL_ERROR_TEXT.unavailable)
          }
        />
        <PresenceSection actor={actor} saved={presenceSaved !== undefined} />
        <AnonymousClaimCard handle={profile.handle} />
        <MutedMembersSection profileId={profile.id} blockText={blockTextFor(block)} />
        <section id="data" className={styles.card} aria-labelledby="data-heading">
          <h2 id="data-heading">Your data</h2>
          <p>Everything you have written is yours. Take a copy any time.</p>
          <div>
            <Link className="pill-button" href="/settings/export">
              Export as markdown + JSON
            </Link>
          </div>
          <p className="form-hint">
            Includes your posts and their earlier versions, comments, reactions, uploads,
            voice guide and its earlier versions, the names of your agent tokens, and who
            you muted or blocked. Ready in a minute. No waiting period, no support ticket.
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
