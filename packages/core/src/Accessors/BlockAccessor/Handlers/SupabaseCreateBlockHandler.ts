import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CreateBlockRequest } from "../Requests/CreateBlockRequest";
import { BlockAccessFailedResponse } from "../Responses/BlockAccessFailedResponse";
import { BlockCreatedResponse } from "../Responses/BlockCreatedResponse";

export class SupabaseCreateBlockHandler implements IHandler<
  CreateBlockRequest,
  BlockCreatedResponse | BlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CreateBlockRequest,
  ): Promise<BlockCreatedResponse | BlockAccessFailedResponse> {
    const { anonymousAuthorId, reason, createdBy, correlationId } = request;
    const { data, error } = await this.db
      .from("blocks")
      .insert({
        anonymous_author_id: anonymousAuthorId,
        reason,
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (error) {
      return new BlockAccessFailedResponse(correlationId, error.message);
    }
    return new BlockCreatedResponse(correlationId, data.id);
  }
}
