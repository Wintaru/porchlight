import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import type { ClaimMemberEmailsRequest } from "../Requests/ClaimMemberEmailsRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { MemberEmailsClaimedResponse } from "../Responses/MemberEmailsClaimedResponse";
import { toMemberEmailClaim } from "../toMemberEmailClaim";

export class SupabaseClaimMemberEmailsHandler implements IHandler<
  ClaimMemberEmailsRequest,
  MemberEmailsClaimedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ClaimMemberEmailsRequest,
  ): Promise<MemberEmailsClaimedResponse | EmailPreferenceAccessFailedResponse> {
    const { until, limit, correlationId } = request;
    const { data, error } = await this.db.rpc("claim_member_emails", {
      p_until: until.toISOString(),
      p_limit: limit,
    });
    if (error) {
      return new EmailPreferenceAccessFailedResponse(correlationId, error.message);
    }
    const claims = data
      .map(toMemberEmailClaim)
      .filter((claim): claim is MemberEmailClaim => claim !== null);
    return new MemberEmailsClaimedResponse(correlationId, claims);
  }
}
