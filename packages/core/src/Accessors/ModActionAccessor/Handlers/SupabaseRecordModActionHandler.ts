import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ModActionTarget } from "../../../Common/ModActionTarget";
import type { RecordModActionRequest } from "../Requests/RecordModActionRequest";
import { ModActionAccessFailedResponse } from "../Responses/ModActionAccessFailedResponse";
import { ModActionRecordedResponse } from "../Responses/ModActionRecordedResponse";

export class SupabaseRecordModActionHandler implements IHandler<
  RecordModActionRequest,
  ModActionRecordedResponse | ModActionAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RecordModActionRequest,
  ): Promise<ModActionRecordedResponse | ModActionAccessFailedResponse> {
    const { actorId, action, target, reason, correlationId } = request;
    const row: TablesInsert<"mod_actions"> = {
      actor_id: actorId,
      action,
      reason,
      ...toTargetColumns(target),
    };
    const { data, error } = await this.db
      .from("mod_actions")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      return new ModActionAccessFailedResponse(correlationId, error.message);
    }
    return new ModActionRecordedResponse(correlationId, data.id);
  }
}

function toTargetColumns(
  target: ModActionTarget,
): Partial<
  Pick<
    TablesInsert<"mod_actions">,
    | "target_post_id"
    | "target_comment_id"
    | "target_profile_id"
    | "target_anonymous_author_id"
    | "target_media_id"
  >
> {
  switch (target.kind) {
    case "post":
      return { target_post_id: target.id };
    case "comment":
      return { target_comment_id: target.id };
    case "profile":
      return { target_profile_id: target.id };
    case "anonymousAuthor":
      return { target_anonymous_author_id: target.id };
    case "media":
      return { target_media_id: target.id };
    case "none":
      return {};
  }
}
