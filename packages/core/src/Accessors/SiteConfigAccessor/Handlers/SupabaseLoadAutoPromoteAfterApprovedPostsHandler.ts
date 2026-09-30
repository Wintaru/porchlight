import type { IHandler } from "../../../Common/IHandler";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";
import { DEFAULT_AUTO_PROMOTE_AFTER_APPROVED_POSTS } from "../../../Common/AutoPromoteRule";
import { AutoPromoteAfterApprovedPostsLoadedResponse } from "../Responses/AutoPromoteAfterApprovedPostsLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import type { LoadAutoPromoteAfterApprovedPostsRequest } from "../Requests/LoadAutoPromoteAfterApprovedPostsRequest";

const AUTO_PROMOTE_KEY = "auto_promote_after_approved_posts";

function isValid(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value));
}

// The value column is jsonb; the key holds a JSON number, or NULL for off (#38: PostgREST
// writes a JSON null as SQL NULL, and reads both back as null). An absent row is the
// default (the key is seeded by #12), an unknown value is a failure, never a silent
// default.
export class SupabaseLoadAutoPromoteAfterApprovedPostsHandler implements IHandler<
  LoadAutoPromoteAfterApprovedPostsRequest,
  AutoPromoteAfterApprovedPostsLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly config: SiteConfigSnapshot) {}

  async handle(
    request: LoadAutoPromoteAfterApprovedPostsRequest,
  ): Promise<
    AutoPromoteAfterApprovedPostsLoadedResponse | SiteConfigAccessFailedResponse
  > {
    const { data, error } = await this.config.row(AUTO_PROMOTE_KEY);
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AutoPromoteAfterApprovedPostsLoadedResponse(
        request.correlationId,
        DEFAULT_AUTO_PROMOTE_AFTER_APPROVED_POSTS,
      );
    }
    if (!isValid(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${AUTO_PROMOTE_KEY} holds ${JSON.stringify(data.value)}, not an integer or null`,
      );
    }
    return new AutoPromoteAfterApprovedPostsLoadedResponse(
      request.correlationId,
      data.value,
    );
  }
}
