import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreTagDescriptionRequest } from "../Requests/StoreTagDescriptionRequest";
import { TagAccessFailedResponse } from "../Responses/TagAccessFailedResponse";
import { TagDescriptionStoredResponse } from "../Responses/TagDescriptionStoredResponse";
import { TagNotFoundResponse } from "../Responses/TagNotFoundResponse";

type Result =
  TagDescriptionStoredResponse | TagNotFoundResponse | TagAccessFailedResponse;

export class SupabaseStoreTagDescriptionHandler implements IHandler<
  StoreTagDescriptionRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: StoreTagDescriptionRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("tags")
      .update({ description_md: request.descriptionMd })
      .eq("slug", request.slug)
      .select("id");
    if (error) {
      return new TagAccessFailedResponse(request.correlationId, error.message);
    }
    return data.length === 0
      ? new TagNotFoundResponse(request.correlationId)
      : new TagDescriptionStoredResponse(request.correlationId);
  }
}
