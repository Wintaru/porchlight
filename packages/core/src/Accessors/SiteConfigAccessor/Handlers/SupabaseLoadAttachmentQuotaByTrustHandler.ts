import type { DbClient } from "@porchlight/db";

import {
  DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
  type AttachmentQuota,
  type AttachmentQuotaByTrust,
} from "../../../Common/AttachmentQuota";
import type { IHandler } from "../../../Common/IHandler";
import { TRUST_LEVELS, type TrustLevel } from "../../../Common/TrustLevel";
import type { LoadAttachmentQuotaByTrustRequest } from "../Requests/LoadAttachmentQuotaByTrustRequest";
import { AttachmentQuotaByTrustLoadedResponse } from "../Responses/AttachmentQuotaByTrustLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const QUOTA_KEY = "attachment_quota_by_trust";

// `max_video_file_bytes` came with video (#21). A row saved before it has none, and
// reads that trust level's default.
function toQuota(value: unknown, level: TrustLevel): AttachmentQuota | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const {
    max_file_bytes: maxFileBytes,
    max_account_bytes: maxAccountBytes,
    max_video_file_bytes: storedVideoBytes,
  } = value as Record<string, unknown>;
  const maxVideoFileBytes =
    storedVideoBytes ?? DEFAULT_ATTACHMENT_QUOTA_BY_TRUST[level].maxVideoFileBytes;
  if (
    typeof maxFileBytes !== "number" ||
    typeof maxAccountBytes !== "number" ||
    typeof maxVideoFileBytes !== "number" ||
    maxFileBytes <= 0 ||
    maxAccountBytes <= 0 ||
    maxVideoFileBytes < 0
  ) {
    return undefined;
  }
  return { maxFileBytes, maxAccountBytes, maxVideoFileBytes };
}

function toQuotaByTrust(value: unknown): AttachmentQuotaByTrust | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const entries = TRUST_LEVELS.map(
    (level) => [level, toQuota(record[level], level)] as const,
  );
  if (entries.some(([, quota]) => quota === undefined)) {
    return undefined;
  }
  return Object.fromEntries(entries) as AttachmentQuotaByTrust;
}

export class SupabaseLoadAttachmentQuotaByTrustHandler implements IHandler<
  LoadAttachmentQuotaByTrustRequest,
  AttachmentQuotaByTrustLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAttachmentQuotaByTrustRequest,
  ): Promise<AttachmentQuotaByTrustLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", QUOTA_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AttachmentQuotaByTrustLoadedResponse(
        request.correlationId,
        DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
      );
    }
    const quotaByTrust = toQuotaByTrust(data.value);
    if (quotaByTrust === undefined) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${QUOTA_KEY} holds ${JSON.stringify(data.value)}, not one quota per trust level`,
      );
    }
    return new AttachmentQuotaByTrustLoadedResponse(request.correlationId, quotaByTrust);
  }
}
