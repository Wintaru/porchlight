import type { DbClient, Json } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreSiteConfigEntriesRequest } from "../Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import { SiteConfigStoredResponse } from "../Responses/SiteConfigStoredResponse";

// One upsert for every row the request carries (SPEC.md §4, §7): a settings-page save
// touching several keys is one round trip, not one per key. A null entry value lands as
// SQL NULL, the column's "unset" state (#38).
export class SupabaseStoreSiteConfigEntriesHandler implements IHandler<
  StoreSiteConfigEntriesRequest,
  SiteConfigStoredResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreSiteConfigEntriesRequest,
  ): Promise<SiteConfigStoredResponse | SiteConfigAccessFailedResponse> {
    if (request.entries.length === 0) {
      return new SiteConfigStoredResponse(request.correlationId);
    }
    const rows = request.entries.map((entry) => ({
      key: entry.key,
      value: entry.value as Json,
      updated_by: request.updatedBy,
    }));
    const { error } = await this.db
      .from("site_config")
      .upsert(rows, { onConflict: "key" });
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    return new SiteConfigStoredResponse(request.correlationId);
  }
}
