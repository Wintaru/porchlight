import type { DbClient } from "@porchlight/db";

import {
  COMMENT_POLICIES,
  type CommentPolicy,
  DEFAULT_COMMENT_POLICY,
} from "../../../Common/CommentPolicy";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentPolicyRequest } from "../Requests/LoadCommentPolicyRequest";
import { CommentPolicyLoadedResponse } from "../Responses/CommentPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const COMMENTS_KEY = "comments";

function isCommentPolicy(value: unknown): value is CommentPolicy {
  return COMMENT_POLICIES.some((policy) => policy === value);
}

// Same shape as the posting policy read: an absent row is the default (the key is
// seeded by #12), an unknown value is a failure, never a silent default.
export class SupabaseLoadCommentPolicyHandler implements IHandler<
  LoadCommentPolicyRequest,
  CommentPolicyLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentPolicyRequest,
  ): Promise<CommentPolicyLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", COMMENTS_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new CommentPolicyLoadedResponse(
        request.correlationId,
        DEFAULT_COMMENT_POLICY,
      );
    }
    if (!isCommentPolicy(data.value)) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${COMMENTS_KEY} holds ${JSON.stringify(data.value)}, not one of ${COMMENT_POLICIES.join(", ")}`,
      );
    }
    return new CommentPolicyLoadedResponse(request.correlationId, data.value);
  }
}
