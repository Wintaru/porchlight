import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { AnnouncePostRequest } from "../Requests/AnnouncePostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostAnnouncedResponse } from "../Responses/PostAnnouncedResponse";

type Result = PostAnnouncedResponse | PostAccessFailedResponse;

// `announce_post` does the claim and the fan-out in one transaction (#87), so a failed
// insert cannot leave a claimed post with no notices.
export class SupabaseAnnouncePostHandler implements IHandler<
  AnnouncePostRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: AnnouncePostRequest): Promise<Result> {
    const { data, error } = await this.db.rpc("announce_post", {
      p_post_id: request.postId,
      p_at: request.timestamp.toISOString(),
    });
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new PostAnnouncedResponse(request.correlationId, data);
  }
}
