import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadTagDescriptionRequest } from "../Requests/LoadTagDescriptionRequest";
import { TagAccessFailedResponse } from "../Responses/TagAccessFailedResponse";
import { TagDescriptionLoadedResponse } from "../Responses/TagDescriptionLoadedResponse";
import { TagNotFoundResponse } from "../Responses/TagNotFoundResponse";

type Result =
  TagDescriptionLoadedResponse | TagNotFoundResponse | TagAccessFailedResponse;

export class SupabaseLoadTagDescriptionHandler implements IHandler<
  LoadTagDescriptionRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadTagDescriptionRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("tags")
      .select("description_md")
      .eq("slug", request.slug)
      .maybeSingle();
    if (error) {
      return new TagAccessFailedResponse(request.correlationId, error.message);
    }
    return data === null
      ? new TagNotFoundResponse(request.correlationId)
      : new TagDescriptionLoadedResponse(request.correlationId, data.description_md);
  }
}
