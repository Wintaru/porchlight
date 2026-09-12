import type { DbClient } from "@porchlight/db";

import { DEFAULT_ATTACHMENT_ALLOWLIST } from "../../../Common/AttachmentAllowlist";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAttachmentAllowlistRequest } from "../Requests/LoadAttachmentAllowlistRequest";
import { AttachmentAllowlistLoadedResponse } from "../Responses/AttachmentAllowlistLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const ALLOWLIST_KEY = "attachment_allowlist";

function isAllowlist(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export class SupabaseLoadAttachmentAllowlistHandler implements IHandler<
  LoadAttachmentAllowlistRequest,
  AttachmentAllowlistLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAttachmentAllowlistRequest,
  ): Promise<AttachmentAllowlistLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", ALLOWLIST_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AttachmentAllowlistLoadedResponse(
        request.correlationId,
        DEFAULT_ATTACHMENT_ALLOWLIST,
      );
    }
    if (!isAllowlist(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${ALLOWLIST_KEY} holds ${JSON.stringify(data.value)}, not a string array`,
      );
    }
    return new AttachmentAllowlistLoadedResponse(request.correlationId, data.value);
  }
}
