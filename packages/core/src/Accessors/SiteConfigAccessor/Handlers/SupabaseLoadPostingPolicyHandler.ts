import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import {
  DEFAULT_POSTING_POLICY,
  POSTING_POLICIES,
  type PostingPolicy,
} from "../../../Common/PostingPolicy";
import type { LoadPostingPolicyRequest } from "../Requests/LoadPostingPolicyRequest";
import { PostingPolicyLoadedResponse } from "../Responses/PostingPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const POSTING_KEY = "posting";

function isPostingPolicy(value: unknown): value is PostingPolicy {
  return POSTING_POLICIES.some((policy) => policy === value);
}

// The value column is jsonb; the key holds a JSON string. An absent row is the default
// (the key is seeded by #12), an unknown value is a failure, never a silent default.
export class SupabaseLoadPostingPolicyHandler implements IHandler<
  LoadPostingPolicyRequest,
  PostingPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostingPolicyRequest,
  ): Promise<PostingPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", POSTING_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new PostingPolicyLoadedResponse(
        request.correlationId,
        DEFAULT_POSTING_POLICY,
      );
    }
    if (!isPostingPolicy(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${POSTING_KEY} holds ${JSON.stringify(data.value)}, not one of ${POSTING_POLICIES.join(", ")}`,
      );
    }
    return new PostingPolicyLoadedResponse(request.correlationId, data.value);
  }
}
