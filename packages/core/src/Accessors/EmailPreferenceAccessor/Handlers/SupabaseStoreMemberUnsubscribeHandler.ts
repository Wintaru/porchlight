import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreMemberUnsubscribeRequest } from "../Requests/StoreMemberUnsubscribeRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberUnsubscribedResponse } from "../Responses/MemberUnsubscribedResponse";

export class SupabaseStoreMemberUnsubscribeHandler implements IHandler<
  StoreMemberUnsubscribeRequest,
  MemberUnsubscribedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreMemberUnsubscribeRequest,
  ): Promise<MemberUnsubscribedResponse | EmailPreferenceAccessFailedResponse> {
    const { token, correlationId } = request;
    const { data, error } = await this.db
      .from("email_preferences")
      .update({
        digest: "off",
        queue_immediate: false,
        updated_at: request.timestamp.toISOString(),
      })
      .eq("unsubscribe_token", token)
      .select("profile_id");
    if (error) {
      return new EmailPreferenceAccessFailedResponse(correlationId, error.message);
    }
    return new MemberUnsubscribedResponse(correlationId, data.length > 0);
  }
}
