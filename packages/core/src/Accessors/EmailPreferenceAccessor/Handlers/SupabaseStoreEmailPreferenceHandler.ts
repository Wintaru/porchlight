import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreEmailPreferenceRequest } from "../Requests/StoreEmailPreferenceRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { EmailPreferenceStoredResponse } from "../Responses/EmailPreferenceStoredResponse";

// `set_email_preferences` moves a window's start to now only when that kind of email
// turns on, which one upsert through PostgREST cannot say.
export class SupabaseStoreEmailPreferenceHandler implements IHandler<
  StoreEmailPreferenceRequest,
  EmailPreferenceStoredResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreEmailPreferenceRequest,
  ): Promise<EmailPreferenceStoredResponse | EmailPreferenceAccessFailedResponse> {
    const { profileId, preference, correlationId } = request;
    const { error } = await this.db.rpc("set_email_preferences", {
      p_profile_id: profileId,
      p_digest: preference.digest,
      p_queue_immediate: preference.queueImmediate,
    });
    if (error) {
      return new EmailPreferenceAccessFailedResponse(correlationId, error.message);
    }
    return new EmailPreferenceStoredResponse(correlationId);
  }
}
