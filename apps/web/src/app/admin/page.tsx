import {
  AGENT_DISCLOSURES,
  MAX_AGENT_DAILY_LIMIT,
  AGENTS_POLICIES,
  COMMENT_POLICIES,
  type DutyChecklistStatus,
  GetSiteConfigRequest,
  KNOWN_ATTACHMENT_TYPES,
  POSTING_POLICIES,
  REGIONS,
  SIGN_UP_POLICIES,
  SITE_CONFIG_PRESETS,
  SiteConfigForbiddenResponse,
  SiteConfigResponse,
  TRUST_LEVELS,
} from "@porchlight/core";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { StaffShell } from "@/components/staff/StaffShell";
import { Toast } from "@/components/toast/Toast";
import { signInPathFor } from "@/lib/sign-in-path";
import { applyPreset, saveSiteConfig } from "./actions";
import styles from "./admin.module.css";

interface AdminPageProps {
  readonly searchParams: Promise<{ readonly done?: string; readonly error?: string }>;
}

const PRESET_LABEL: Record<(typeof SITE_CONFIG_PRESETS)[number], string> = {
  just_me: "Just me",
  friends: "Friends",
  open_porch: "Open porch",
};

const PRESET_DESCRIPTION: Record<(typeof SITE_CONFIG_PRESETS)[number], string> = {
  just_me: "Staff post, anyone comments, sign-up closed.",
  friends: "Members post, anyone comments, sign-up by invite.",
  open_porch: "Anyone posts, anyone comments, sign-up open.",
};

const DUTY_STATUS_LABEL: Record<DutyChecklistStatus, string> = {
  configured: "Configured",
  fake: "Using the fake (fine for local development)",
  fakeInProduction: "Not yet active — the fake is answering in production",
};

const ERROR_TEXT: Readonly<Record<string, string>> = {
  "not-allowed": "This account may not manage the site's settings.",
  "signed-out": "Sign in as the site's admin first.",
  "account-inactive": "This account cannot make changes right now.",
  unavailable: "The settings could not be saved. Try again in a moment.",
  agentLimits: `Each agent limit is a whole number from 0 to ${String(MAX_AGENT_DAILY_LIMIT)}.`,
  agentDisclosure: "Pick a disclosure setting from the list.",
};

// The admin settings page (SPEC.md §4, §7): region and the duty checklist, site
// identity, the D20 access keys and their presets, attachments, moderation, and
// retention, in the staff frame of the Queue board (#49).
export default async function AdminPage({ searchParams }: AdminPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/admin"));
  }

  const response = await getDependencyContainer().siteConfigManager.query(
    new GetSiteConfigRequest(actor),
  );
  if (response instanceof SiteConfigForbiddenResponse) {
    notFound();
  }
  if (!(response instanceof SiteConfigResponse)) {
    console.error(`site config load failed [${response.correlationId}]`, response);
    throw new Error("The site settings could not be loaded. Try again in a moment.");
  }

  const { config, regionProfile, dutyChecklist } = response;
  const { done, error } = await searchParams;
  const errorText = error === undefined ? undefined : (ERROR_TEXT[error] ?? `${error}.`);

  return (
    <StaffShell current="admin" isAdmin>
      <h1 className={styles.title}>Site settings</h1>
      {done === "saved" && <Toast message="Saved." param="done" testId="form-status" />}
      {errorText !== undefined && (
        <p role="alert" className="form-alert" data-testid="form-error">
          {errorText}
        </p>
      )}

      <section
        id="duties"
        className={styles.card}
        aria-labelledby="duty-checklist-heading"
      >
        <h2 id="duty-checklist-heading">Duty checklist</h2>
        <ul className={styles.duties}>
          {dutyChecklist.map((item) => (
            <li key={item.id} data-status={item.status} data-testid={`duty-${item.id}`}>
              <span className={styles.dot} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>: {DUTY_STATUS_LABEL[item.status]}{" "}
                <span className={styles.muted}>(see {item.setupGuidePath})</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="presets-heading">
        <h2 id="presets-heading">Setup presets</h2>
        <p>
          A preset sets posting, comments and sign-up only. Change any one of them below
          afterward.
        </p>
        <div className={styles.presets}>
          {SITE_CONFIG_PRESETS.map((preset) => (
            <form action={applyPreset} key={preset} className={styles.preset}>
              <input type="hidden" name="preset" value={preset} />
              <button
                type="submit"
                className="pill-button"
                data-testid={`preset-${preset}`}
              >
                {PRESET_LABEL[preset]}
              </button>
              <p>{PRESET_DESCRIPTION[preset]}</p>
            </form>
          ))}
        </div>
      </section>

      <form action={saveSiteConfig} className={styles.form}>
        <section className={styles.card} aria-labelledby="identity-heading">
          <h2 id="identity-heading">Site identity</h2>
          <div className={styles.grid}>
            <label className="field">
              <span className="field-label">Site name</span>
              <input
                className="text-input"
                type="text"
                name="siteName"
                defaultValue={config.siteIdentity.siteName}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Tagline</span>
              <input
                className="text-input"
                type="text"
                name="siteTagline"
                defaultValue={config.siteIdentity.siteTagline}
              />
            </label>
          </div>
          <label className="field">
            <span className="field-label">About (markdown)</span>
            <textarea
              className="text-input"
              name="aboutMd"
              defaultValue={config.siteIdentity.aboutMd}
            />
          </label>
        </section>

        <section className={styles.card} aria-labelledby="access-heading">
          <h2 id="access-heading">Access</h2>
          <div className={styles.grid}>
            <PolicySelect
              label="Posting"
              name="posting"
              value={config.posting}
              options={POSTING_POLICIES}
            />
            <PolicySelect
              label="Comments"
              name="comments"
              value={config.comments}
              options={COMMENT_POLICIES}
            />
            <PolicySelect
              label="Sign-up"
              name="signUp"
              value={config.signUp}
              options={SIGN_UP_POLICIES}
            />
            <PolicySelect
              label="Agents"
              name="agents"
              value={config.agents}
              options={AGENTS_POLICIES}
            />
            <PolicySelect
              label="Agent disclosure"
              name="agentDisclosure"
              value={config.agentDisclosure}
              options={AGENT_DISCLOSURES}
            />
            <NumberField
              label="Agent drafts per day"
              name="agentDraftsPerDay"
              value={config.agentLimits.draftsPerDay}
              min={0}
              max={MAX_AGENT_DAILY_LIMIT}
            />
            <NumberField
              label="Agent publishes per day"
              name="agentPublishesPerDay"
              value={config.agentLimits.publishesPerDay}
              min={0}
              max={MAX_AGENT_DAILY_LIMIT}
            />
          </div>
          {config.signUp === "invite" && (
            <p className="form-hint">
              Invite links are not active yet (issue #25). Sign-up behaves as closed until
              then.
            </p>
          )}
          <p className="form-hint">
            Agents: who may mint a personal token for their own writing agent (D22). Off
            hides the Agents section of every member&apos;s settings. Disclosure: whether
            a post an agent drafted says so under it. The daily limits count per token; 0
            turns that action off.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="region-heading">
          <h2 id="region-heading">Region</h2>
          {/* Not "Region" again: the section landmark already carries that name from its
              heading, and two controls named "Region" make the field ambiguous to
              assistive tech and to getByLabel (#39). */}
          <PolicySelect
            label="Hosting region"
            name="region"
            value={config.region}
            options={REGIONS}
          />
          <p data-testid="region-reporting-target">
            Reporting target: {regionProfile.reportingTarget} (
            {regionProfile.reportingContact})
          </p>
          <p className={styles.muted}>{regionProfile.deadlineText}</p>
          <p data-testid="region-ip-window">
            Raw IP retention window: {String(regionProfile.ipWindowDays)} days (starting
            point — set the exact value under Retention below).
          </p>
          {regionProfile.warning !== null && (
            <p role="alert" className="form-alert" data-testid="region-warning">
              {regionProfile.warning}
            </p>
          )}
          <p className="form-hint">
            1-year minimum retention for locked items, the audit log, and scanning are
            always on, regardless of region.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="attachments-heading">
          <h2 id="attachments-heading">Attachments</h2>
          <fieldset>
            <legend className="field-label">Allowed types</legend>
            <div className={styles.checks}>
              {KNOWN_ATTACHMENT_TYPES.map((type) => (
                <label key={type.extension} className="check">
                  <input
                    type="checkbox"
                    name="attachmentAllowlist"
                    value={type.extension}
                    defaultChecked={config.attachmentAllowlist.includes(type.extension)}
                  />
                  {type.extension}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="field-label">Anonymous upload cap</legend>
            <div className={styles.grid}>
              <NumberField
                label="Files"
                name="anonymousUploadCapFiles"
                value={config.anonymousUploadCap.files}
              />
              <NumberField
                label="Bytes per file"
                name="anonymousUploadCapBytesPerFile"
                value={config.anonymousUploadCap.bytesPerFile}
              />
            </div>
          </fieldset>
          {TRUST_LEVELS.map((level) => (
            <fieldset key={level}>
              <legend className="field-label">Byte caps for {level} members</legend>
              <div className={styles.grid}>
                <NumberField
                  label="Max file bytes"
                  name={`${level}MaxFileBytes`}
                  value={config.attachmentQuotaByTrust[level].maxFileBytes}
                />
                <NumberField
                  label="Max account bytes"
                  name={`${level}MaxAccountBytes`}
                  value={config.attachmentQuotaByTrust[level].maxAccountBytes}
                />
              </div>
            </fieldset>
          ))}
        </section>

        <section className={styles.card} aria-labelledby="moderation-heading">
          <h2 id="moderation-heading">Moderation</h2>
          <label className="field">
            <span className="field-label">
              Auto-promote after this many approved posts (leave blank to keep off)
            </span>
            <input
              className="text-input"
              type="number"
              name="autoPromoteAfterApprovedPosts"
              min={1}
              defaultValue={config.autoPromoteAfterApprovedPosts ?? ""}
            />
          </label>
          <fieldset>
            <legend className="field-label">
              Image classifier thresholds (may only be lowered from the shipped default)
            </legend>
            <div className={styles.grid}>
              <NumberField
                label="Flag at"
                name="moderationFlagAt"
                value={config.moderationThresholds.flagAt}
                step="0.01"
                min={0}
                max={1}
              />
              <NumberField
                label="Lock at"
                name="moderationLockAt"
                value={config.moderationThresholds.lockAt}
                step="0.01"
                min={0}
                max={1}
              />
            </div>
          </fieldset>
        </section>

        <section className={styles.card} aria-labelledby="retention-heading">
          <h2 id="retention-heading">Retention</h2>
          <NumberField
            label="Raw IP retention window (days)"
            name="rawIpRetentionDays"
            value={config.rawIpRetentionDays}
          />
        </section>

        <div className={styles.save}>
          <button type="submit" className="pill-button pill-button--amber">
            Save settings
          </button>
        </div>
      </form>
    </StaffShell>
  );
}

function PolicySelect({
  label,
  name,
  value,
  options,
}: {
  readonly label: string;
  readonly name: string;
  readonly value: string;
  readonly options: readonly string[];
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="text-input" name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
  step,
  min = 1,
  max,
}: {
  readonly label: string;
  readonly name: string;
  readonly value: number;
  readonly step?: string;
  readonly min?: number;
  readonly max?: number;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="text-input"
        type="number"
        name={name}
        min={min}
        max={max}
        step={step}
        defaultValue={value}
      />
    </label>
  );
}
