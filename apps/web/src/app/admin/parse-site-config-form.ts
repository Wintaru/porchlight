import {
  AGENTS_POLICIES,
  COMMENT_POLICIES,
  MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS,
  POSTING_POLICIES,
  REGIONS,
  SIGN_UP_POLICIES,
  type SiteConfigSnapshot,
  TRUST_LEVELS,
} from "@porchlight/core";

// The admin settings form always sends every field (it is seeded from the loaded
// snapshot's `defaultValue`s), so the save is a full snapshot, not a diff. This parses
// the raw `FormData` into that shape, or reports the first field that did not parse.
export interface ParsedSiteConfigForm {
  readonly ok: true;
  readonly config: Partial<SiteConfigSnapshot>;
}

export interface SiteConfigFormError {
  readonly ok: false;
  readonly field: string;
}

export function parseSiteConfigForm(
  formData: FormData,
): ParsedSiteConfigForm | SiteConfigFormError {
  const posting = oneOf(formData, "posting", POSTING_POLICIES);
  if (posting === undefined) {
    return { ok: false, field: "posting" };
  }
  const comments = oneOf(formData, "comments", COMMENT_POLICIES);
  if (comments === undefined) {
    return { ok: false, field: "comments" };
  }
  const signUp = oneOf(formData, "signUp", SIGN_UP_POLICIES);
  if (signUp === undefined) {
    return { ok: false, field: "signUp" };
  }
  const agents = oneOf(formData, "agents", AGENTS_POLICIES);
  if (agents === undefined) {
    return { ok: false, field: "agents" };
  }
  const region = oneOf(formData, "region", REGIONS);
  if (region === undefined) {
    return { ok: false, field: "region" };
  }
  const siteName = formData.get("siteName");
  const siteTagline = formData.get("siteTagline");
  const aboutMd = formData.get("aboutMd");
  if (
    typeof siteName !== "string" ||
    typeof siteTagline !== "string" ||
    typeof aboutMd !== "string"
  ) {
    return { ok: false, field: "siteIdentity" };
  }
  const attachmentAllowlist = formData.getAll("attachmentAllowlist");
  if (!attachmentAllowlist.every(isString)) {
    return { ok: false, field: "attachmentAllowlist" };
  }
  const anonymousFiles = positiveInt(formData, "anonymousUploadCapFiles");
  const anonymousBytes = positiveInt(formData, "anonymousUploadCapBytesPerFile");
  if (anonymousFiles === undefined || anonymousBytes === undefined) {
    return { ok: false, field: "anonymousUploadCap" };
  }
  const quotaEntries = TRUST_LEVELS.map((level) => ({
    level,
    maxFileBytes: positiveInt(formData, `${level}MaxFileBytes`),
    maxAccountBytes: positiveInt(formData, `${level}MaxAccountBytes`),
  }));
  if (
    quotaEntries.some(
      (entry) => entry.maxFileBytes === undefined || entry.maxAccountBytes === undefined,
    )
  ) {
    return { ok: false, field: "attachmentQuotaByTrust" };
  }
  const attachmentQuotaByTrust = Object.fromEntries(
    quotaEntries.map((entry) => [
      entry.level,
      { maxFileBytes: entry.maxFileBytes, maxAccountBytes: entry.maxAccountBytes },
    ]),
  );
  const flagAt = fraction(formData, "moderationFlagAt");
  const lockAt = fraction(formData, "moderationLockAt");
  if (flagAt === undefined || lockAt === undefined) {
    return { ok: false, field: "moderationThresholds" };
  }
  const rawIpRetentionDays = positiveInt(formData, "rawIpRetentionDays");
  if (rawIpRetentionDays === undefined) {
    return { ok: false, field: "rawIpRetentionDays" };
  }
  const autoPromoteRaw = formData.get("autoPromoteAfterApprovedPosts");
  if (typeof autoPromoteRaw !== "string") {
    return { ok: false, field: "autoPromoteAfterApprovedPosts" };
  }
  const autoPromoteAfterApprovedPosts = parseAutoPromote(autoPromoteRaw);
  if (autoPromoteAfterApprovedPosts === "invalid") {
    return { ok: false, field: "autoPromoteAfterApprovedPosts" };
  }

  return {
    ok: true,
    config: {
      posting,
      comments,
      signUp,
      agents,
      region,
      siteIdentity: { siteName, siteTagline, aboutMd },
      attachmentAllowlist,
      anonymousUploadCap: { files: anonymousFiles, bytesPerFile: anonymousBytes },
      attachmentQuotaByTrust:
        attachmentQuotaByTrust as SiteConfigSnapshot["attachmentQuotaByTrust"],
      moderationThresholds: { flagAt, lockAt },
      rawIpRetentionDays,
      autoPromoteAfterApprovedPosts,
    },
  };
}

function isString(value: FormDataEntryValue): value is string {
  return typeof value === "string";
}

function oneOf<const T extends readonly string[]>(
  formData: FormData,
  name: string,
  known: T,
): T[number] | undefined {
  const value = formData.get(name);
  return typeof value === "string" && known.includes(value) ? value : undefined;
}

function positiveInt(formData: FormData, name: string): number | undefined {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function fraction(formData: FormData, name: string): number | undefined {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseAutoPromote(value: string): number | null | "invalid" {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS) {
    return "invalid";
  }
  return parsed;
}
