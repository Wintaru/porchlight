import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { StoreSiteConfigEntriesRequest } from "../../../Accessors/SiteConfigAccessor/Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigStoredResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigStoredResponse";
import type { SiteConfigEntry } from "../../../Accessors/SiteConfigAccessor/SiteConfigEntry";
import type { Actor } from "../../../Common/Actor";
import { attachmentTypeForExtension } from "../../../Common/AttachmentTypeCatalog";
import {
  DEFAULT_MODERATION_THRESHOLDS,
  type ModerationThresholds,
} from "../../../Common/ModerationThresholds";
import { COMMENT_POLICIES } from "../../../Common/CommentPolicy";
import { MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS } from "../../../Common/AutoPromoteRule";
import { POSTING_POLICIES } from "../../../Common/PostingPolicy";
import { REGIONS } from "../../../Common/Region";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IHandler } from "../../../Common/IHandler";
import { SIGN_UP_POLICIES } from "../../../Common/SignUpPolicy";
import {
  ABOUT_MD_MAX_LENGTH,
  SITE_NAME_MAX_LENGTH,
  SITE_TAGLINE_MAX_LENGTH,
} from "../../../Common/SiteIdentity";
import { TRUST_LEVELS } from "../../../Common/TrustLevel";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionUnavailableResponse } from "../../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import type { SaveSiteConfigRequest } from "../Requests/SaveSiteConfigRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigInvalidResponse } from "../Responses/SiteConfigInvalidResponse";
import { SiteConfigSavedResponse } from "../Responses/SiteConfigSavedResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";

type Verdict =
  | SiteConfigSavedResponse
  | SiteConfigForbiddenResponse
  | SiteConfigInvalidResponse
  | SiteConfigUnavailableResponse;

// Validates every field the request carries against its domain type, then writes the
// whole batch in one accessor call (SPEC.md §4, §7). The moderation thresholds may only
// come down from the shipped default, never go up — the spec's "tunable only toward
// more caution" rule, enforced here because nothing upstream of this handler can
// approve a value (Common/ModerationThresholds.ts).
export class SaveSiteConfigHandler implements IHandler<SaveSiteConfigRequest, Verdict> {
  constructor(
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: SaveSiteConfigRequest): Promise<Verdict> {
    const { correlationId, actor, update } = request;
    const context: RequestContext = { correlationId };
    const verdict = await this.permissions.evaluate(
      new EvaluatePermissionRequest(
        actor,
        "site_config.manage",
        { kind: "site" },
        context,
      ),
    );
    if (verdict instanceof PermissionDeniedResponse) {
      return new SiteConfigForbiddenResponse(correlationId, verdict.reason);
    }
    if (verdict instanceof PermissionUnavailableResponse) {
      return new SiteConfigUnavailableResponse(correlationId, verdict.reason);
    }

    const entries = entriesFor(update);
    if (!Array.isArray(entries)) {
      return new SiteConfigInvalidResponse(correlationId, entries.field, entries.message);
    }
    if (entries.length === 0) {
      return new SiteConfigSavedResponse(correlationId);
    }

    const stored = await this.siteConfig.store(
      new StoreSiteConfigEntriesRequest(entries, actorId(actor), context),
    );
    if (stored instanceof SiteConfigStoredResponse) {
      return new SiteConfigSavedResponse(correlationId);
    }
    return new SiteConfigUnavailableResponse(
      correlationId,
      "reason" in stored && typeof stored.reason === "string"
        ? stored.reason
        : `unexpected ${stored.constructor.name} from store`,
    );
  }
}

function actorId(actor: Actor): string {
  return actor.kind === "member" ? actor.profile.id : "system";
}

interface FieldError {
  readonly field: string;
  readonly message: string;
}

// Validates every present field and serializes it to its `site_config` row shape in one
// pass; the first invalid field short-circuits the rest.
function entriesFor(update: Partial<SiteConfigSnapshot>): SiteConfigEntry[] | FieldError {
  const entries: SiteConfigEntry[] = [];

  if (update.posting !== undefined) {
    if (!POSTING_POLICIES.some((policy) => policy === update.posting)) {
      return { field: "posting", message: "not a known posting policy" };
    }
    entries.push({ key: "posting", value: update.posting });
  }

  if (update.comments !== undefined) {
    if (!COMMENT_POLICIES.some((policy) => policy === update.comments)) {
      return { field: "comments", message: "not a known comment policy" };
    }
    entries.push({ key: "comments", value: update.comments });
  }

  if (update.signUp !== undefined) {
    if (!SIGN_UP_POLICIES.some((policy) => policy === update.signUp)) {
      return { field: "signUp", message: "not a known sign-up policy" };
    }
    entries.push({ key: "sign_up", value: update.signUp });
  }

  if (update.region !== undefined) {
    if (!REGIONS.some((region) => region === update.region)) {
      return { field: "region", message: "not a known region" };
    }
    entries.push({ key: "region", value: update.region });
  }

  if (update.siteIdentity !== undefined) {
    const error = identityError(update.siteIdentity);
    if (error !== undefined) {
      return error;
    }
    entries.push(
      { key: "site_name", value: update.siteIdentity.siteName },
      { key: "site_tagline", value: update.siteIdentity.siteTagline },
      { key: "about_md", value: update.siteIdentity.aboutMd },
    );
  }

  if (update.attachmentAllowlist !== undefined) {
    const error = allowlistError(update.attachmentAllowlist);
    if (error !== undefined) {
      return error;
    }
    entries.push({ key: "attachment_allowlist", value: update.attachmentAllowlist });
  }

  if (update.anonymousUploadCap !== undefined) {
    const { files, bytesPerFile } = update.anonymousUploadCap;
    if (!isPositiveInteger(files) || !isPositiveInteger(bytesPerFile)) {
      return {
        field: "anonymousUploadCap",
        message: "files and bytesPerFile must be positive integers",
      };
    }
    entries.push({
      key: "anonymous_upload_cap",
      value: { files, bytes_per_file: bytesPerFile },
    });
  }

  if (update.attachmentQuotaByTrust !== undefined) {
    const quotaByTrust = update.attachmentQuotaByTrust;
    const error = quotaByTrustError(quotaByTrust);
    if (error !== undefined) {
      return error;
    }
    const value = Object.fromEntries(
      TRUST_LEVELS.map((level) => {
        const quota = quotaByTrust[level];
        return [
          level,
          {
            max_file_bytes: quota.maxFileBytes,
            max_account_bytes: quota.maxAccountBytes,
          },
        ];
      }),
    );
    entries.push({ key: "attachment_quota_by_trust", value });
  }

  if (update.moderationThresholds !== undefined) {
    const error = thresholdsError(update.moderationThresholds);
    if (error !== undefined) {
      return error;
    }
    entries.push({
      key: "moderation_thresholds",
      value: {
        flag_at: update.moderationThresholds.flagAt,
        lock_at: update.moderationThresholds.lockAt,
      },
    });
  }

  if (update.rawIpRetentionDays !== undefined) {
    if (!isPositiveInteger(update.rawIpRetentionDays)) {
      return {
        field: "rawIpRetentionDays",
        message: "must be a positive integer",
      };
    }
    entries.push({ key: "raw_ip_retention_days", value: update.rawIpRetentionDays });
  }

  if (update.autoPromoteAfterApprovedPosts !== undefined) {
    const value = update.autoPromoteAfterApprovedPosts;
    if (
      value !== null &&
      (!isPositiveInteger(value) || value < MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS)
    ) {
      return {
        field: "autoPromoteAfterApprovedPosts",
        message: `must be null or an integer of at least ${String(MIN_AUTO_PROMOTE_AFTER_APPROVED_POSTS)}`,
      };
    }
    entries.push({ key: "auto_promote_after_approved_posts", value });
  }

  return entries;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function identityError(
  identity: SiteConfigSnapshot["siteIdentity"],
): FieldError | undefined {
  const siteName = identity.siteName.trim();
  if (siteName === "" || siteName.length > SITE_NAME_MAX_LENGTH) {
    return {
      field: "siteIdentity",
      message: `site name must be 1 to ${String(SITE_NAME_MAX_LENGTH)} characters`,
    };
  }
  if (identity.siteTagline.length > SITE_TAGLINE_MAX_LENGTH) {
    return {
      field: "siteIdentity",
      message: `tagline is at most ${String(SITE_TAGLINE_MAX_LENGTH)} characters`,
    };
  }
  if (identity.aboutMd.length > ABOUT_MD_MAX_LENGTH) {
    return {
      field: "siteIdentity",
      message: `about text is at most ${String(ABOUT_MD_MAX_LENGTH)} characters`,
    };
  }
  return undefined;
}

function allowlistError(allowlist: readonly string[]): FieldError | undefined {
  if (allowlist.length === 0) {
    return { field: "attachmentAllowlist", message: "at least one extension is needed" };
  }
  const unknown = allowlist.find(
    (extension) => attachmentTypeForExtension(extension) === undefined,
  );
  if (unknown !== undefined) {
    return {
      field: "attachmentAllowlist",
      message: `${unknown} is not a known attachment type`,
    };
  }
  return undefined;
}

function quotaByTrustError(
  quotaByTrust: SiteConfigSnapshot["attachmentQuotaByTrust"],
): FieldError | undefined {
  for (const level of TRUST_LEVELS) {
    const quota = quotaByTrust[level];
    if (
      !isPositiveInteger(quota.maxFileBytes) ||
      !isPositiveInteger(quota.maxAccountBytes) ||
      quota.maxFileBytes > quota.maxAccountBytes
    ) {
      return {
        field: "attachmentQuotaByTrust",
        message: `${level}: maxFileBytes and maxAccountBytes must be positive integers, and maxFileBytes may not exceed maxAccountBytes`,
      };
    }
  }
  return undefined;
}

// "Tunable only toward more caution" (SPEC.md §7): a threshold may come down from the
// shipped default, never go up.
function thresholdsError(thresholds: ModerationThresholds): FieldError | undefined {
  if (
    thresholds.flagAt <= 0 ||
    thresholds.lockAt <= 0 ||
    thresholds.flagAt > thresholds.lockAt
  ) {
    return {
      field: "moderationThresholds",
      message: "flagAt and lockAt must be positive, with flagAt at most lockAt",
    };
  }
  if (
    thresholds.flagAt > DEFAULT_MODERATION_THRESHOLDS.flagAt ||
    thresholds.lockAt > DEFAULT_MODERATION_THRESHOLDS.lockAt
  ) {
    return {
      field: "moderationThresholds",
      message: `thresholds may only be lowered from the shipped default (flagAt ${String(DEFAULT_MODERATION_THRESHOLDS.flagAt)}, lockAt ${String(DEFAULT_MODERATION_THRESHOLDS.lockAt)}), never raised`,
    };
  }
  return undefined;
}
