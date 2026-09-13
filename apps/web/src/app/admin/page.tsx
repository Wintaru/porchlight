import {
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
import { signInPathFor } from "@/lib/sign-in-path";
import { applyPreset, saveSiteConfig } from "./actions";

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
};

// The admin settings page (SPEC.md §4, §7): region and the duty checklist, site
// identity, the D20 access keys and their presets, attachments, moderation, and
// retention. Unstyled until issue #16 lands the tokens, the same as every other page
// built before it.
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
    <main>
      <h1>Site settings</h1>
      {done === "saved" && (
        <p role="status" data-testid="form-status">
          Saved.
        </p>
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}

      <section aria-labelledby="duty-checklist-heading">
        <h2 id="duty-checklist-heading">Duty checklist</h2>
        <ul>
          {dutyChecklist.map((item) => (
            <li key={item.id} data-testid={`duty-${item.id}`}>
              <strong>{item.status === "configured" ? "🟢" : "🔴"}</strong> {item.label}:{" "}
              {DUTY_STATUS_LABEL[item.status]} (see {item.setupGuidePath})
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="presets-heading">
        <h2 id="presets-heading">Setup presets</h2>
        <p>
          A preset sets posting, comments and sign-up only. Change any one of them below
          afterward.
        </p>
        {SITE_CONFIG_PRESETS.map((preset) => (
          <form
            action={applyPreset}
            key={preset}
            style={{ display: "inline-block", marginRight: "1em" }}
          >
            <input type="hidden" name="preset" value={preset} />
            <button type="submit" data-testid={`preset-${preset}`}>
              {PRESET_LABEL[preset]}
            </button>
            <p>{PRESET_DESCRIPTION[preset]}</p>
          </form>
        ))}
      </section>

      <form action={saveSiteConfig}>
        <section aria-labelledby="identity-heading">
          <h2 id="identity-heading">Site identity</h2>
          <label>
            Site name
            <input
              type="text"
              name="siteName"
              defaultValue={config.siteIdentity.siteName}
              required
            />
          </label>
          <label>
            Tagline
            <input
              type="text"
              name="siteTagline"
              defaultValue={config.siteIdentity.siteTagline}
            />
          </label>
          <label>
            About (markdown)
            <textarea name="aboutMd" defaultValue={config.siteIdentity.aboutMd} />
          </label>
        </section>

        <section aria-labelledby="access-heading">
          <h2 id="access-heading">Access</h2>
          <label>
            Posting
            <select name="posting" defaultValue={config.posting}>
              {POSTING_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </label>
          <label>
            Comments
            <select name="comments" defaultValue={config.comments}>
              {COMMENT_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sign-up
            <select name="signUp" defaultValue={config.signUp}>
              {SIGN_UP_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </label>
          {config.signUp === "invite" && (
            <p>
              Invite links are not active yet (issue #25). Sign-up behaves as closed until
              then.
            </p>
          )}
        </section>

        <section aria-labelledby="region-heading">
          <h2 id="region-heading">Region</h2>
          <label>
            Region
            <select name="region" defaultValue={config.region}>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <p data-testid="region-reporting-target">
            Reporting target: {regionProfile.reportingTarget} (
            {regionProfile.reportingContact})
          </p>
          <p>{regionProfile.deadlineText}</p>
          <p data-testid="region-ip-window">
            Raw IP retention window: {String(regionProfile.ipWindowDays)} days (starting
            point — set the exact value under Retention below).
          </p>
          {regionProfile.warning !== null && (
            <p role="alert" data-testid="region-warning">
              {regionProfile.warning}
            </p>
          )}
          <p>
            1-year minimum retention for locked items, the audit log, and scanning are
            always on, regardless of region.
          </p>
        </section>

        <section aria-labelledby="attachments-heading">
          <h2 id="attachments-heading">Attachments</h2>
          <fieldset>
            <legend>Allowed types</legend>
            {KNOWN_ATTACHMENT_TYPES.map((type) => (
              <label key={type.extension}>
                <input
                  type="checkbox"
                  name="attachmentAllowlist"
                  value={type.extension}
                  defaultChecked={config.attachmentAllowlist.includes(type.extension)}
                />
                {type.extension}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Anonymous upload cap</legend>
            <label>
              Files
              <input
                type="number"
                name="anonymousUploadCapFiles"
                min={1}
                defaultValue={config.anonymousUploadCap.files}
              />
            </label>
            <label>
              Bytes per file
              <input
                type="number"
                name="anonymousUploadCapBytesPerFile"
                min={1}
                defaultValue={config.anonymousUploadCap.bytesPerFile}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Byte caps by trust level</legend>
            {TRUST_LEVELS.map((level) => (
              <div key={level}>
                <p>{level}</p>
                <label>
                  Max file bytes
                  <input
                    type="number"
                    name={`${level}MaxFileBytes`}
                    min={1}
                    defaultValue={config.attachmentQuotaByTrust[level].maxFileBytes}
                  />
                </label>
                <label>
                  Max account bytes
                  <input
                    type="number"
                    name={`${level}MaxAccountBytes`}
                    min={1}
                    defaultValue={config.attachmentQuotaByTrust[level].maxAccountBytes}
                  />
                </label>
              </div>
            ))}
          </fieldset>
        </section>

        <section aria-labelledby="moderation-heading">
          <h2 id="moderation-heading">Moderation</h2>
          <label>
            Auto-promote after this many approved posts (leave blank to keep off)
            <input
              type="number"
              name="autoPromoteAfterApprovedPosts"
              min={1}
              defaultValue={config.autoPromoteAfterApprovedPosts ?? ""}
            />
          </label>
          <fieldset>
            <legend>
              Image classifier thresholds (may only be lowered from the shipped default)
            </legend>
            <label>
              Flag at
              <input
                type="number"
                name="moderationFlagAt"
                step="0.01"
                min={0}
                max={1}
                defaultValue={config.moderationThresholds.flagAt}
              />
            </label>
            <label>
              Lock at
              <input
                type="number"
                name="moderationLockAt"
                step="0.01"
                min={0}
                max={1}
                defaultValue={config.moderationThresholds.lockAt}
              />
            </label>
          </fieldset>
        </section>

        <section aria-labelledby="retention-heading">
          <h2 id="retention-heading">Retention</h2>
          <label>
            Raw IP retention window (days)
            <input
              type="number"
              name="rawIpRetentionDays"
              min={1}
              defaultValue={config.rawIpRetentionDays}
            />
          </label>
        </section>

        <button type="submit">Save settings</button>
      </form>
    </main>
  );
}
