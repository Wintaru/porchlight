import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReleaseMemberEmailRequest } from "../Requests/ReleaseMemberEmailRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailReleasedResponse } from "../Responses/MemberEmailReleasedResponse";

export class SupabaseReleaseMemberEmailHandler implements IHandler<
  ReleaseMemberEmailRequest,
  MemberEmailReleasedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReleaseMemberEmailRequest,
  ): Promise<MemberEmailReleasedResponse | EmailPreferenceAccessFailedResponse> {
    const { claim, correlationId } = request;
    const { error } = await this.db.rpc("release_member_email", {
      p_profile_id: claim.profileId,
      p_kind: claim.kind,
      p_window_start: claim.windowStart.toISOString(),
      p_window_end: claim.windowEnd.toISOString(),
    });
    if (error) {
      return new EmailPreferenceAccessFailedResponse(correlationId, error.message);
    }
    return new MemberEmailReleasedResponse(correlationId);
  }
}
