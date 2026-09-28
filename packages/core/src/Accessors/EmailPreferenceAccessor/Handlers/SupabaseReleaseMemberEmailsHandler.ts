import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReleaseMemberEmailsRequest } from "../Requests/ReleaseMemberEmailsRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailsReleasedResponse } from "../Responses/MemberEmailsReleasedResponse";

export class SupabaseReleaseMemberEmailsHandler implements IHandler<
  ReleaseMemberEmailsRequest,
  MemberEmailsReleasedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReleaseMemberEmailsRequest,
  ): Promise<MemberEmailsReleasedResponse | EmailPreferenceAccessFailedResponse> {
    const { claims, correlationId } = request;
    if (claims.length === 0) {
      return new MemberEmailsReleasedResponse(correlationId);
    }
    const { error } = await this.db.rpc("release_member_emails", {
      p_claims: claims.map((claim) => ({
        profile_id: claim.profileId,
        kind: claim.kind,
        window_start: claim.windowStart.toISOString(),
        window_end: claim.windowEnd.toISOString(),
      })),
    });
    if (error) {
      return new EmailPreferenceAccessFailedResponse(correlationId, error.message);
    }
    return new MemberEmailsReleasedResponse(correlationId);
  }
}
