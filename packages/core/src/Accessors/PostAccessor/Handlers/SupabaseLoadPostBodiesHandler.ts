import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadPostBodiesRequest } from "../Requests/LoadPostBodiesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodiesLoadedResponse } from "../Responses/PostBodiesLoadedResponse";

export class SupabaseLoadPostBodiesHandler implements IHandler<
  LoadPostBodiesRequest,
  PostBodiesLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadPostBodiesRequest,
  ): Promise<PostBodiesLoadedResponse | PostAccessFailedResponse> {
    const { afterId, limit, correlationId } = request;
    const query = this.db.from("posts").select("id, body_md, body_html");
    const { data, error } = await (afterId === null ? query : query.gt("id", afterId))
      .order("id", { ascending: true })
      .limit(limit);
    if (error) {
      return new PostAccessFailedResponse(correlationId, error.message);
    }
    return new PostBodiesLoadedResponse(
      correlationId,
      data.map((row) => ({ id: row.id, bodyMd: row.body_md, bodyHtml: row.body_html })),
    );
  }
}
