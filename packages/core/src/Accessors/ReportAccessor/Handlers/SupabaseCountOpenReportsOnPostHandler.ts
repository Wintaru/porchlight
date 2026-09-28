import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CountOpenReportsOnPostRequest } from "../Requests/CountOpenReportsOnPostRequest";
import { OpenReportsCountedResponse } from "../Responses/OpenReportsCountedResponse";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";

// A head request: the count only, through `reports_post_idx`.
export class SupabaseCountOpenReportsOnPostHandler implements IHandler<
  CountOpenReportsOnPostRequest,
  OpenReportsCountedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CountOpenReportsOnPostRequest,
  ): Promise<OpenReportsCountedResponse | ReportAccessFailedResponse> {
    const { count, error } = await this.db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("post_id", request.postId)
      .in("status", ["open", "escalated"]);
    if (error) {
      return new ReportAccessFailedResponse(request.correlationId, error.message);
    }
    return new OpenReportsCountedResponse(request.correlationId, count ?? 0);
  }
}
