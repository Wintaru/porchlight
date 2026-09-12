import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadQuotaUsageRequest } from "../Requests/LoadQuotaUsageRequest";
import { QuotaAccessFailedResponse } from "../Responses/QuotaAccessFailedResponse";
import { QuotaUsageLoadedResponse } from "../Responses/QuotaUsageLoadedResponse";

export class SupabaseLoadQuotaUsageHandler implements IHandler<
  LoadQuotaUsageRequest,
  QuotaUsageLoadedResponse | QuotaAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadQuotaUsageRequest,
  ): Promise<QuotaUsageLoadedResponse | QuotaAccessFailedResponse> {
    const { profileId, correlationId } = request;
    const { data, error } = await this.db
      .from("quotas")
      .select("bytes_used, files_count")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) {
      return new QuotaAccessFailedResponse(correlationId, error.message);
    }
    return new QuotaUsageLoadedResponse(
      correlationId,
      data?.bytes_used ?? 0,
      data?.files_count ?? 0,
    );
  }
}
