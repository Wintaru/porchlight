import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { DEFAULT_RAW_IP_RETENTION_DAYS } from "../../../Common/Retention";
import type { LoadRawIpRetentionDaysRequest } from "../Requests/LoadRawIpRetentionDaysRequest";
import { RawIpRetentionDaysLoadedResponse } from "../Responses/RawIpRetentionDaysLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const RETENTION_KEY = "raw_ip_retention_days";

export class SupabaseLoadRawIpRetentionDaysHandler implements IHandler<
  LoadRawIpRetentionDaysRequest,
  RawIpRetentionDaysLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadRawIpRetentionDaysRequest,
  ): Promise<RawIpRetentionDaysLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", RETENTION_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null || typeof data.value !== "number" || data.value <= 0) {
      return new RawIpRetentionDaysLoadedResponse(
        request.correlationId,
        DEFAULT_RAW_IP_RETENTION_DAYS,
      );
    }
    return new RawIpRetentionDaysLoadedResponse(request.correlationId, data.value);
  }
}
