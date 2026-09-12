import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { AdjustQuotaUsageRequest } from "../Requests/AdjustQuotaUsageRequest";
import { QuotaAccessFailedResponse } from "../Responses/QuotaAccessFailedResponse";
import { QuotaUsageStoredResponse } from "../Responses/QuotaUsageStoredResponse";

type Result = QuotaUsageStoredResponse | QuotaAccessFailedResponse;

// Read-then-upsert, not one atomic statement: a member's own uploads are already
// serialized by the editor's own request flow, so the race window between the read and
// the write below (two finalizes for the same member landing at the exact same instant)
// is not worth a database function for. If that ever changes, this is where an atomic
// increment belongs.
export class SupabaseAdjustQuotaUsageHandler implements IHandler<
  AdjustQuotaUsageRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: AdjustQuotaUsageRequest): Promise<Result> {
    const { profileId, deltaBytes, deltaFiles, correlationId } = request;
    const current = await this.db
      .from("quotas")
      .select("bytes_used, files_count")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (current.error) {
      return new QuotaAccessFailedResponse(correlationId, current.error.message);
    }
    const bytesUsed = Math.max(0, (current.data?.bytes_used ?? 0) + deltaBytes);
    const filesCount = Math.max(0, (current.data?.files_count ?? 0) + deltaFiles);
    const { error } = await this.db
      .from("quotas")
      .upsert(
        { profile_id: profileId, bytes_used: bytesUsed, files_count: filesCount },
        { onConflict: "profile_id" },
      );
    if (error) {
      return new QuotaAccessFailedResponse(correlationId, error.message);
    }
    return new QuotaUsageStoredResponse(correlationId, bytesUsed, filesCount);
  }
}
